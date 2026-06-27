import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setSession } from '../redux/slices/sessionSlice';
import { switchUser } from '../services/userService';
import { colors } from '../theme/colors';

interface Props {
  onSwitch: () => void;
}

const SLOTS: { key: 'alex' | 'jordan'; label: string }[] = [
  { key: 'alex', label: 'Alex (Test)' },
  { key: 'jordan', label: 'Jordan (Test)' },
];

const SessionSwitcher: React.FC<Props> = ({ onSwitch }) => {
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.session);
  const [loading, setLoading] = React.useState(false);

  const handleSwitch = async (slot: string) => {
    if (session.slot === slot || loading) return;
    setLoading(true);
    try {
      const info = await switchUser(slot);
      dispatch(setSession({ userId: info.userId, slot: info.slot, name: info.name, photo: info.photo }));
      onSwitch();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Chatting as:</Text>
      <View style={styles.pills}>
        {SLOTS.map((s) => {
          const active = session.slot === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => handleSwitch(s.key)}
              disabled={loading}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>
      {session.photo ? (
        <Image source={{ uri: session.photo }} style={styles.avatar} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
  },
  pills: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flex: 1,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  pillTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
  },
});

export default SessionSwitcher;
