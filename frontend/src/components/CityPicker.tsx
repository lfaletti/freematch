import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
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
}

// Backend URL - Railway staging (fallback to local for dev)
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function CityPicker({ value, onChange, onSelectCity, placeholder }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchCities = useCallback(async (text: string) => {
    if (text.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/cities?q=${encodeURIComponent(text)}`);
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Failed to search cities:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        searchCities(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchCities]);

  const handleSelect = (city: City) => {
    setQuery(city.display);
    onChange(city.display);
    onSelectCity?.(city);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const handleFocus = () => {
    setShowDropdown(true);
    if (query.length >= 2 && results.length > 0) {
      searchCities(query);
    }
  };

  const handleBlur = () => {
    // Delay hiding to allow tap on dropdown item
    setTimeout(() => setShowDropdown(false), 200);
  };

  const dropdownOpen = showDropdown && results.length > 0;

  return (
    <View style={[styles.container, dropdownOpen && styles.containerOpen]}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder ?? t('editProfile.locationPlaceholder')}
        placeholderTextColor={colors.textMuted}
        onFocus={handleFocus}
        onBlur={handleBlur}
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
            keyExtractor={(_item, index) => `${_item.name}-${index}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.resultText}>{item.display}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  // When the dropdown is open, lift the WHOLE picker above the sibling fields
  // that follow it in the form. zIndex only competes among siblings in the same
  // stacking context; the absolutely-positioned dropdown alone can be painted
  // under later fields, so the container itself must carry the z-index.
  containerOpen: {
    zIndex: 9999,
    elevation: 100,
    // Some parents clip absolutely-positioned children (overflow: hidden).
    // Overriding here is a no-op if the parent clips, but harmless.
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
    top: '100%',
    left: 0,
    right: 0,
    // Opaque, slightly lighter than the fields behind it (colors.surface) so the
    // open list reads as a solid panel on top rather than blending/"transparent"
    // with the inputs/chips underneath.
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 9999,
    elevation: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultText: {
    fontSize: 15,
    color: colors.text,
  },
});
