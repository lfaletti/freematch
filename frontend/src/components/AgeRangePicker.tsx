import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent, DimensionValue } from 'react-native';
import { colors } from '../theme/colors';

// Pickable scale. The backend accepts 18..120 but 99 is the practical ceiling
// for a dating swipe range.
export const AGE_MIN_FLOOR = 18;
export const AGE_MAX_CEILING = 99;

interface Props {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}

export const AGE_SCALE_MIN = AGE_MIN_FLOOR;

const SPAN = AGE_MAX_CEILING - AGE_MIN_FLOOR; // 81 values

const toRatio = (v: number) => (v - AGE_MIN_FLOOR) / SPAN;
const fromRatio = (r: number) =>
  Math.round(AGE_MIN_FLOOR + Math.max(0, Math.min(1, r)) * SPAN);

/**
 * A two-thumb slider for the preferred [min, max] age range.
 *
 * The whole control (rail + thumbs) lives inside one measured box whose
 * onLayout is the same box that owns the PanResponder, so finger coordinates
 * map 1:1 to values with no offset. You can grab a thumb or simply press and
 * drag anywhere on the rail — the thumb nearest to where you touch is the one
 * that follows your finger, including from either edge. Tapping the numbers is
 * not a separate editing path: minimum and maximum are only changed by sliding.
 */
export default function AgeRangePicker({ min, max, onChange }: Props) {
  const box = useRef<{ x: number; w: number }>({ x: 0, w: 0 });
  const [measured, setMeasured] = useState(false);

  const onLayout = (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    box.current = { x, w: width };
    setMeasured(true);
  };

  const drag = useRef<{ which: 'min' | 'max'; baseMin: number; baseMax: number } | null>(null);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Always become the responder on touch so drags from any point (including
        // grabbing the thumbs / sliding from the very edges) move a handle.
        onPanResponderGrant: (_, g) => {
          const { x, w } = box.current;
          if (w <= 0) return;
          const tapRatio = Math.max(0, Math.min(1, (g.x0 - x) / w));
          const minR = toRatio(min);
          const maxR = toRatio(Math.min(max, AGE_MAX_CEILING));
          // Grab whichever handle is closer to the press point.
          const which = Math.abs(tapRatio - minR) <= Math.abs(tapRatio - maxR) ? 'min' : 'max';
          drag.current = { which, baseMin: min, baseMax: max };
          commit(which, tapRatio, { baseMin: min, baseMax: max });
        },
        onPanResponderMove: (_, g) => {
          const d = drag.current;
          const { x, w } = box.current;
          if (!d || w <= 0) return;
          const ratio = Math.max(0, Math.min(1, (g.moveX - x) / w));
          commit(d.which, ratio, d);
        },
        onPanResponderTerminate: () => { drag.current = null; },
        onPanResponderRelease: () => { drag.current = null; },
      }),
    [min, max, measured],
  );

  // Apply a drag value to whichever handle is active, clamping against the other
  // handle and the scale bounds.
  const commit = (which: 'min' | 'max', ratio: number, d: { baseMin: number; baseMax: number }) => {
    const next = fromRatio(ratio);
    if (which === 'min') {
      const nm = Math.min(d.baseMax, Math.max(AGE_MIN_FLOOR, next));
      onChange(nm, d.baseMax);
    } else {
      const nx = Math.max(d.baseMin, Math.min(AGE_MAX_CEILING, next));
      onChange(d.baseMin, nx);
    }
  };

  const dispMax = Math.min(max, AGE_MAX_CEILING);
  const minPct = toRatio(min) * 100;
  const maxPct = toRatio(dispMax) * 100;
  const leftVal: DimensionValue = `${minPct.toFixed(2)}%` as any;
  const widthVal: DimensionValue = `${(maxPct - minPct).toFixed(2)}%` as any;
  const maxLeftVal: DimensionValue = `${maxPct.toFixed(2)}%` as any;

  return (
    <View>
      {/* Readout of the selected range (display only — editing happens by sliding) */}
      <View style={styles.valueRow}>
        <Text style={styles.valueText}>
          {`${min} – ${dispMax === AGE_MAX_CEILING ? '99+' : dispMax}`}
        </Text>
      </View>

      {/* Measured area: owns onLayout AND the drag gesture, so they share one box. */}
      <View style={styles.control} onLayout={onLayout} {...pan.panHandlers}>
        {/* Rail */}
        <View style={styles.rail} pointerEvents="none" />
        {/* Active span */}
        <View
          style={[styles.railActive, { left: leftVal, width: widthVal }]}
          pointerEvents="none"
        />
        {/* Thumb label (min) */}
        <View style={[styles.thumb, { left: leftVal }]} pointerEvents="none">
          <Text style={styles.thumbValue}>{min}</Text>
        </View>
        {/* Thumb (max) */}
        <View style={[styles.thumb, { left: maxLeftVal }]} pointerEvents="none">
          <Text style={styles.thumbValue}>{dispMax === AGE_MAX_CEILING ? '99' : dispMax}</Text>
        </View>
      </View>

      {/* End ticks */}
      <View style={styles.endsRow}>
        <Text style={styles.endText}>{AGE_MIN_FLOOR}</Text>
        <Text style={styles.endText}>{AGE_MAX_CEILING}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  valueRow: {
    alignItems: 'center',
    marginBottom: 6,
  },
  valueText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  control: {
    height: 44,
    justifyContent: 'center',
    position: 'relative',
  },
  rail: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  railActive: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    top: 8,
    width: 40,
    height: 40,
    marginLeft: -20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    zIndex: 2,
  },
  thumbValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  endsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  endText: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
