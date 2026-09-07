import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder, LayoutChangeEvent, DimensionValue } from 'react-native';
import { colors } from '../theme/colors';

// Pickable scale. The backend accepts 18..120 but 99 is the sane ceiling for a
// dating swipe range (beyond that you're matching basically anyone).
export const AGE_MIN_FLOOR = 18;
export const AGE_MAX_CEILING = 99;

interface Props {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
  onChange: (min: number, max: number) => void;
}

const SPAN = AGE_MAX_CEILING - AGE_MIN_FLOOR; // 81 values

// Convert between a value in [18,99] and a 0..1 progress on the track.
const toRatio = (v: number) => (v - AGE_MIN_FLOOR) / SPAN;
const fromRatio = (r: number) =>
  Math.round(AGE_MIN_FLOOR + Math.max(0, Math.min(1, r)) * SPAN);

// A two-thumb slider for the preferred [min, max] age range. A single
// PanResponder over the whole rail drags whichever thumb is nearer the touch,
// so it works identically on web (mouse/pointer) and native (touch) without a
// third-party slider lib. min stays clamped to [18, max], max to [min, 99].
export default function AgeRangePicker({ min, max, minLabel = 'min', maxLabel = 'max', onChange }: Props) {
  const [trackW, setTrackW] = useState(0);
  const track = useRef<{ x: number; w: number }>({ x: 0, w: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    track.current = { x, w: width };
    setTrackW(width);
  };

  // Local copy of the range under drag so the thumb we release onto lands on the
  // right edge and React state stays in sync throughout the gesture.
  const drag = useRef<{ which: 'min' | 'max'; baseMin: number; baseMax: number } | null>(null);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (_, g) => {
          // Decide which thumb to drag from the absolute touch x relative to the
          // rail — pick the closer of the two current positions.
          const { x, w } = track.current;
          if (w <= 0) return;
          const tapX = g.x0 - x;
          const midX = (toRatio(min) + toRatio(Math.min(max, AGE_MAX_CEILING))) / 2 * w;
          drag.current = { which: tapX <= midX ? 'min' : 'max', baseMin: min, baseMax: max };
          const next = fromRatio(tapX / w);
          if (drag.current.which === 'min') {
            const nm = Math.min(drag.current.baseMax, Math.max(AGE_MIN_FLOOR, next));
            onChange(nm, drag.current.baseMax);
          } else {
            const nx = Math.max(drag.current.baseMin, Math.min(AGE_MAX_CEILING, next));
            onChange(drag.current.baseMin, nx);
          }
        },
        onPanResponderMove: (_, g) => {
          const d = drag.current;
          const { x, w } = track.current;
          if (!d || w <= 0) return;
          const next = fromRatio((g.moveX - x) / w);
          if (d.which === 'min') {
            const nm = Math.min(d.baseMax, Math.max(AGE_MIN_FLOOR, next));
            if (nm !== min) onChange(nm, d.baseMax);
          } else {
            const nx = Math.max(d.baseMin, Math.min(AGE_MAX_CEILING, next));
            if (nx !== max) onChange(d.baseMin, nx);
          }
        },
        onPanResponderTerminate: () => { drag.current = null; },
        onPanResponderRelease: () => { drag.current = null; },
      }),
    [min, max, trackW],
  );

  const dispMax = Math.min(max, AGE_MAX_CEILING);
  const pct = (r: number): DimensionValue => `${(r * 100).toFixed(2)}%` as any;
  const activeLeft = pct(toRatio(min));
  const rightPct = toRatio(dispMax);
  const maxLeft = pct(rightPct);
  const activeWidth = pct(rightPct - toRatio(min));

  return (
    <View>
      {/* Selected value — the single most useful readout */}
      <View style={styles.valueRow}>
        <Text style={styles.valueText}>{`${min} – ${dispMax === AGE_MAX_CEILING ? '99+' : dispMax}`}</Text>
      </View>

      {/* Track visuals (rail + active span + thumbs), rendered relative to the
          hit area that owns onLayout so gesture→value maps exactly to what the
          user touches. */}
      <View style={styles.stage}>
        <View style={styles.railLine} />
        <View
          style={[
            styles.railActive,
            { left: activeLeft, width: activeWidth },
          ]}
          pointerEvents="none"
        />
        {/* Both thumbs, centered at their value's track position */}
        <View style={[styles.thumbWrap, { left: activeLeft }]} pointerEvents="none">
          <View style={styles.thumb} />
        </View>
        <View
          style={[styles.thumbWrap, { left: maxLeft }]}
          pointerEvents="none"
        >
          <View style={styles.thumb} />
        </View>
      </View>

      {/* Transparent hit target spanning the whole rail, drives both thumbs.
          It owns onLayout because gesture coordinates are measured against it. */}
      <View style={styles.hitArea} onLayout={onLayout} {...pan.panHandlers} />

      {/* Min / max labels on the ends */}
      <View style={styles.endsRow}>
        <Text style={styles.endText}>{AGE_MIN_FLOOR}</Text>
        <Text style={styles.endCaption}>{`${minLabel} − ${maxLabel}`}</Text>
        <Text style={styles.endText}>{AGE_MAX_CEILING}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  valueRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  valueText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  track: {
    height: 36,
    justifyContent: 'center',
    marginBottom: 2,
  },
  railLine: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  railActive: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  thumbWrap: {
    position: 'absolute',
    width: 26,
    height: 26,
    top: 5,
    marginLeft: -13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  // The rail visuals occupy the normal flow and paint the line mid-height; the
  // stage pins the thumbs on top of the same box.
  stage: {
    height: 36,
    justifyContent: 'center',
    position: 'relative',
  },
  // Absolute overlay that owns the drag gesture; matches the stage size so a
  // touch anywhere on the track maps 1:1 to a value.
  hitArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    zIndex: 5,
  },
  endsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  endText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  endCaption: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
});
