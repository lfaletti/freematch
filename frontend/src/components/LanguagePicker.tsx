import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, Language } from '../i18n';
import { colors } from '../theme/colors';

type Props = {
  value: Language;
  onChange: (lang: Language) => void;
};

/**
 * Selector de idioma reutilizable (chips Español / English).
 * Mostrado tanto en la creación de cuenta como en la edición de perfil.
 */
export default function LanguagePicker({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <View style={styles.chipRow}>
        {LANGUAGES.map((lang) => {
          const selected = value === lang.code;
          return (
            <TouchableOpacity
              key={lang.code}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onChange(lang.code)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.white,
  },
});
