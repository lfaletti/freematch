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
  Modal,
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
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputWrapRef = useRef<View>(null);

  // Measure the input's position so the Modal-rendered dropdown is anchored
  // right below it (a Modal covers the whole screen, so it can't use the
  // parent's relative coordinates).
  const anchorDropdown = useCallback(() => {
    if (inputWrapRef.current && typeof (inputWrapRef.current as any).measureInWindow === 'function') {
      (inputWrapRef.current as any).measureInWindow((x: number, y: number, w: number, h: number) => {
        setDropdownStyle({ top: y + h + 4, left: x, width: w });
      });
    } else {
      setDropdownStyle(null);
    }
  }, []);

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
    // Anchor the Modal-rendered dropdown to the input's on-screen position.
    anchorDropdown();
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
    <View style={styles.container} ref={inputWrapRef}>
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

      {/* The dropdown is rendered in a transparent Modal so it is always drawn
          ON TOP of the following form fields (e.g. "Radio de búsqueda") no
          matter the parent scroll stacking context. Rendering it inline as an
          absolutely-positioned child lets later siblings paint over it on web
          despite zIndex, which made the list hard to select. */}
      <Modal visible={dropdownOpen} transparent animationType="none" onRequestClose={() => setShowDropdown(false)}>
        <TouchableOpacity style={styles.modalRoot} activeOpacity={1} onPress={() => setShowDropdown(false)}>
          <View style={[styles.dropdown, dropdownStyle]}>
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
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  // Full-screen transparent layer behind the Modal dropdown; tapping outside
  // closes it. Light and transparent so the form is still visible behind it.
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.01)',
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
    top: 0,
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
