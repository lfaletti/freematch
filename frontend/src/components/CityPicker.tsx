import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

interface City {
  name: string;
  city: string;
  state: string;
  country: string;
  display: string;
  lat: number;
  lon: number;
}

interface Props {
  value: string;
  onChange: (city: string) => void;
  onSelectCity?: (city: City) => void;
  placeholder?: string;
  /** Called with true when the dropdown opens, false when it closes. */
  onOpenChange?: (open: boolean) => void;
  /**
   * Optional bias coordinates from the user's profile (the centroid of the city
   * they previously chose). Used to rank nearby cities first on Geoapify. The
   * component also requests a one-off, cached device geolocation which takes
   * precedence when available.
   */
  biasLat?: number | null;
  biasLon?: number | null;
}

// Backend URL - Railway staging (fallback to local for dev)
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const GEOLOC_CACHE_KEY = 'freematch_geoloc_cache';
const IS_WEB = Platform.OS === 'web';

// Normalize text for accent-insensitive matching: lowercase + strip diacritics
// (Bahía -> bahia). This is only used to order Geoapify's results locally; the
// search itself is delegated to Geoapify which already handles accents.
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

interface GeoCache {
  lat: number;
  lon: number;
  at: number;
}

function loadCachedGeoloc(): GeoCache | null {
  if (!IS_WEB) return null;
  try {
    const raw = localStorage.getItem(GEOLOC_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoCache;
    if (
      parsed &&
      typeof parsed.lat === 'number' &&
      typeof parsed.lon === 'number' &&
      Number.isFinite(parsed.lat) &&
      Number.isFinite(parsed.lon)
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

// Request the device location ONCE and remember it (so we never spam the
// permission prompt). Respects the product guardrail: a one-off, user-consented
// geolocation used to rank cities — never continuous tracking. On native a
// proper expo-location integration would wrap this; today the app runs on web.
function resolveGeolocation(): Promise<GeoCache | null> {
  const cached = loadCachedGeoloc();
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    if (!IS_WEB || typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const entry: GeoCache = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          at: Date.now(),
        };
        try {
          localStorage.setItem(GEOLOC_CACHE_KEY, JSON.stringify(entry));
        } catch {
          /* ignore */
        }
        resolve(entry);
      },
      () => resolve(null), // denied/unavailable → fall back to profile bias
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 15 * 60 * 1000 },
    );
  });
}

// Score how strongly a candidate result matches the user's typed prefix. Higher
// is better. Used to override Geoapify's ranking when it surfaces an exact-name
// match from the wrong country (e.g. "Bahia, BR") over a prefix match for the
// nearby city the user actually means.
function prefixScore(candidate: City, qNorm: string): number {
  if (!qNorm) return 0;
  // Search over the most relevant name fields.
  const haystack = normalize([candidate.city, candidate.name, candidate.state, candidate.country].filter(Boolean).join(' '));
  const nameNorm = normalize(candidate.city || candidate.name);
  if (nameNorm === qNorm) return 1000; // exact city name match
  if (nameNorm.startsWith(qNorm)) return 500; // city starts with prefix
  if (haystack.startsWith(qNorm)) return 400; // display starts with prefix
  if (haystack.includes(qNorm)) return 200; // prefix appears somewhere
  return 0;
}

export default function CityPicker({
  value,
  onChange,
  onSelectCity,
  placeholder,
  onOpenChange,
  biasLat,
  biasLon,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // The effective bias used for ranking. Prefers a real (cached) device
  // location; otherwise falls back to the profile centroid passed as props.
  const [useBias, setUseBias] = useState<{ lat: number; lon: number } | null>(null);
  const geolocRequested = useRef(false);

  // On first focus we request the device location once (it is cached to disk so
  // later sessions reuse it without prompting again). We only ask when the field
  // is actually about to be used — never on app start.
  const ensureBias = useCallback(async () => {
    if (geolocRequested.current) return;
    geolocRequested.current = true;
    const geo = await resolveGeolocation();
    if (geo) {
      const rounded = { lat: geo.lat, lon: geo.lon };
      setUseBias(rounded);
      return;
    }
    // No device location (denied / unsupported): use the profile's city centroid
    // if the host screen provided one.
    if (typeof biasLat === 'number' && typeof biasLon === 'number') {
      setUseBias({ lat: biasLat, lon: biasLon });
    }
  }, [biasLat, biasLon]);

  const searchCities = useCallback(
    async (text: string) => {
      if (text.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        let url = `${API_BASE}/api/cities?q=${encodeURIComponent(text)}`;
        if (useBias) {
          url += `&lat=${useBias.lat}&lon=${useBias.lon}`;
        }
        const response = await fetch(url);
        const data = (await response.json()) as City[];
        if (!Array.isArray(data)) {
          setResults([]);
          return;
        }
        // Local re-rank: prefer prefix matches (accent-insensitive) that point
        // to the city the user is typing, rather than trusting Geoapify's
        // raw order (which can surface an exact-name match from another
        // country). Stability is preserved for ties (sort is stable in V8).
        const qNorm = normalize(text);
        const ranked = [...data].sort((a, b) => prefixScore(b, qNorm) - prefixScore(a, qNorm));
        setResults(ranked);
      } catch (err) {
        console.error('Failed to search cities:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [useBias],
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) searchCities(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchCities]);

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleSelect = (city: City) => {
    setQuery(city.display);
    onChange(city.display);
    onSelectCity?.(city);
    closeDropdown();
    Keyboard.dismiss();
  };

  const dropdownOpen = showDropdown && results.length > 0;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder ?? t('editProfile.locationPlaceholder')}
        placeholderTextColor={colors.textMuted}
        onFocus={() => {
          setShowDropdown(true);
          onOpenChange?.(true);
          ensureBias();
          if (query.length >= 2) searchCities(query);
        }}
        onBlur={() => {
          // delay so a tap on a result item registers before the list unmounts
          setTimeout(closeDropdown, 120);
        }}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {dropdownOpen && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(_item, index) => `${_item.name}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)} activeOpacity={0.7}>
                <Text style={styles.resultText}>{item.display}</Text>
              </TouchableOpacity>
            )}
            style={styles.list}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    // While open, lift this whole subtree so the absolutely-positioned list
    // paints above the sibling fields that follow it in the ScrollView.
    zIndex: 9999,
    elevation: 9999,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  loader: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  dropdown: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    marginTop: 4,
    backgroundColor: '#222222',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 9999,
    elevation: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  list: {
    maxHeight: 220,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultText: {
    fontSize: 15,
    color: colors.text,
  },
});
