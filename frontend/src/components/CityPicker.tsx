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
  /** Called with true when the dropdown opens, false when it closes. */
  onOpenChange?: (open: boolean) => void;
}

// Backend URL - Railway staging (fallback to local for dev)
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default function CityPicker({ value, onChange, onSelectCity, placeholder, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  // Screen-position anchor for the Modal-rendered dropdown (a Modal covers the
  // whole screen, so the list must be placed using viewport coordinates).
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputWrapRef = useRef<View>(null);

  // Measure the input's on-screen position so the Modal dropdown sits right
  // below it. Only render the list once we have a real anchor (avoids a flash
  // at the top-left corner).
  const anchorDropdown = useCallback(() => {
    const node = inputWrapRef.current as any;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x: number, y: number, w: number, h: number) => {
        setDropdownStyle({ top: y + h + 4, left: x, width: w });
      });
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

  const handleFocus = () => {
    setShowDropdown(true);
    onOpenChange?.(true);
    anchorDropdown();
    if (query.length >= 2 && results.length > 0) {
      searchCities(query);
    }
  };

  // The input's position can shift while the modal is open (scroll, layout),
  // so re-anchor every time the dropdown transitions to open.
  const dropdownOpen = showDropdown && results.length > 0;
  useEffect(() => {
    if (dropdownOpen) anchorDropdown();
  }, [dropdownOpen, anchorDropdown]);

  return (
    <View style={styles.container} ref={inputWrapRef}>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder ?? t('editProfile.locationPlaceholder')}
        placeholderTextColor={colors.textMuted}
        onFocus={handleFocus}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* The dropdown is rendered in a transparent Modal so it is always drawn
          ON TOP of the following form fields (e.g. "Radio de búsqueda"),
          regardless of the parent ScrollView's stacking context. The backdrop
          and the list are SIBLINGS (not nested): the list sits above the
          backdrop, so tapping a result selects it instead of the backdrop
          swallowing the press and closing the modal first. */}
      <Modal visible={dropdownOpen && dropdownStyle !== null} transparent animationType="none" onRequestClose={closeDropdown}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDropdown} />
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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
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
  // Full-screen transparent layer behind the list. The list is a sibling that
  // renders ABOVE the backdrop (declared after it), so item presses land on the
  // list while presses anywhere else land on the backdrop and close the modal.
  overlay: {
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    // Fondo totalmente opaco y distintivo para que la lista se lea como un
    // panel sólido encima de lo que quede detrás (ej. Radio de búsqueda).
    backgroundColor: '#222222',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 220,
    overflow: 'hidden',
    zIndex: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
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
