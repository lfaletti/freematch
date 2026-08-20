import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// Preset search radii (km). The deck shows ONLY people within the chosen
// radius of the user's city — no fallback to "everyone" when empty.
export const RADIUS_OPTIONS = [10, 25, 50, 100];

interface Props {
  value: number;
  onChange: (km: number) => void;
}

export default function RadiusPicker({ value, onChange }: Props) {
  return (
    <View style={styles.chipRow}>
      {RADIUS_OPTIONS.map((km) => {
        const selected = value === km;
        return (
          <TouchableOpacity
            key={km}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(km)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {km} km
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
