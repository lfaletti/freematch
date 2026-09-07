import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

// Floor/ceiling for the pickable age range (hard legal lower bound of 18;
// 99 stands for "no upper bound" which is the practical default).
export const AGE_MIN_FLOOR = 18;
export const AGE_MAX_CEILING = 120;

interface Props {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  onChange: (min: number, max: number) => void;
}

// A compact inline stepper pair for the preferred match age range. Tapping −/+
// moves one extreme at a time; min can't drop under 18 and max can't exceed
// the legal ceiling, and shifting min past max pushes max along (and vice
// versa) so the range always stays valid with no modal choreography.
export default function AgeRangePicker({ min, max, minLabel = 'min', maxLabel = 'max', onChange }: Props) {
  const decMin = () => {
    if (min <= AGE_MIN_FLOOR) return;
    onChange(min - 1, Math.max(max, min - 1));
  };
  const incMin = () => {
    if (min >= max) return;
    onChange(min + 1, max);
  };
  const decMax = () => {
    if (max <= min) return;
    onChange(min, max - 1);
  };
  const incMax = () => {
    if (max >= AGE_MAX_CEILING) return;
    onChange(min, max + 1);
  };

  return (
    <View style={styles.box}>
      <View style={styles.column}>
        <Text style={styles.caption}>{minLabel}</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={decMin} disabled={min <= AGE_MIN_FLOOR} activeOpacity={0.7}>
            <Text style={[styles.stepText, min <= AGE_MIN_FLOOR && styles.stepDisabled]}>−</Text>
          </TouchableOpacity>
          <Text style={styles.value}>{min}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={incMin} disabled={min >= max} activeOpacity={0.7}>
            <Text style={[styles.stepText, min >= max && styles.stepDisabled]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.dash}>–</Text>

      <View style={styles.column}>
        <Text style={styles.caption}>{maxLabel}</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={decMax} disabled={max <= min} activeOpacity={0.7}>
            <Text style={[styles.stepText, max <= min && styles.stepDisabled]}>−</Text>
          </TouchableOpacity>
          <Text style={styles.value}>{max === AGE_MAX_CEILING ? '99+' : max}</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={incMax}
            disabled={max >= AGE_MAX_CEILING}
            activeOpacity={0.7}
          >
            <Text style={[styles.stepText, max >= AGE_MAX_CEILING && styles.stepDisabled]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  column: {
    alignItems: 'center',
  },
  caption: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 4,
  },
  stepBtn: {
    width: 40,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    lineHeight: 24,
  },
  stepDisabled: {
    color: colors.border,
  },
  value: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  dash: {
    fontSize: 28,
    color: colors.textMuted,
    marginBottom: 24,
  },
});
