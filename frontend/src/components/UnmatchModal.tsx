import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { UnmatchNotice } from '../redux/slices/matchesSlice';

const { width } = Dimensions.get('window');

interface UnmatchModalProps {
  notice: UnmatchNotice | null;
  onClose: () => void;
}

const PLACEHOLDER_PHOTO = 'https://randomuser.me/api/portraits/lego/1.jpg';

/**
 * The mirror of MatchModal: shown app-wide when the other person unmatches us.
 * Same card layout, but a broken-heart tone instead of the celebratory one.
 */
const UnmatchModal: React.FC<UnmatchModalProps> = ({ notice, onClose }) => {
  if (!notice) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.emoji}>💔</Text>
          <Text style={styles.title}>Person Unmatched</Text>
          <Text style={styles.subtitle}>
            {notice.name} cancelled the connection
          </Text>

          <View style={styles.photoWrap}>
            <Image
              source={{ uri: notice.photo || PLACEHOLDER_PHOTO }}
              style={styles.photo}
            />
          </View>

          <TouchableOpacity style={styles.okBtn} onPress={onClose}>
            <Text style={styles.okBtnText}>Okay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: Math.min(width * 0.88, 380),
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  photoWrap: {
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 32,
    opacity: 0.6,
  },
  photo: {
    width: 100,
    height: 100,
  },
  okBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  okBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
});

export default UnmatchModal;
