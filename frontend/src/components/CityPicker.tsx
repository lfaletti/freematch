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
  const inputRef = useRef<TextInput>(null);

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

  // NOTE: we deliberately do NOT wrap the dropdown in a react-native <Modal>.
  //
  // In react-native-web running inside a mobile browser (e.g. Chrome on
  // Android/iOS), a transparent <Modal> mounts a full-screen position:fixed
  // overlay. While that overlay is in the tree it reliably breaks the soft
  // keyboard: tapping the <input> behind/under it never brings up the keyboard
  // or steals first tap. A plain absolutely-positioned dropdown (siblings under
  // the input) keeps normal focus so the keyboard works on touch devices.
  //
  // For the old reason a Modal was chosen (making the list paint ABOVE the
  // following form fields when the parent ScrollView clips/orders siblings):
  // instead of a portal we raise the wrapper's z-index/elevation while open.
  // The parent field (EditProfile/CreateAccount) also lifts via onOpenChange,
  // so the open list always stacks above the sibling that follows it.
  const dropdownOpen = showDropdown && results.length > 0;

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder ?? t('editProfile.locationPlaceholder')}
        placeholderTextColor={colors.textMuted}
        onFocus={() => {
          setShowDropdown(true);
          onOpenChange?.(true);
          if (query.length >= 2) searchCities(query);
        }}
        onBlur={() => {
          // Small delay so a tap on a result item registers before we unmount
          // the list on blur.
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
        <View style={[styles.dropdown, showDropdown && styles.dropdownRaised]}>
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
    maxHeight: 220,
    overflow: 'visible',
    // These let the list escape a parent with overflow: hidden on web while it
    // still stacking above later siblings.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  dropdownRaised: {
    zIndex: 9999,
    elevation: 9999,
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
