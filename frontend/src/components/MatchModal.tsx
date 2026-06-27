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
import { Match } from '../redux/slices/matchesSlice';

const { width } = Dimensions.get('window');

interface MatchModalProps {
  match: Match | null;
  onClose: () => void;
  onChat: () => void;
}

const MatchModal: React.FC<MatchModalProps> = ({ match, onClose, onChat }) => {
  if (!match) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>It's a Match!</Text>
          <Text style={styles.subtitle}>
            You and {match.partner_name} liked each other
          </Text>

          <View style={styles.photos}>
            <View style={styles.photoWrap}>
              <Image
                source={{ uri: 'https://randomuser.me/api/portraits/lego/1.jpg' }}
                style={styles.photo}
              />
            </View>
            <View style={styles.heartContainer}>
              <Text style={styles.heart}>❤️</Text>
            </View>
            <View style={styles.photoWrap}>
              <Image source={{ uri: match.partner_photo }} style={styles.photo} />
            </View>
          </View>

          <TouchableOpacity style={styles.chatBtn} onPress={onChat}>
            <Text style={styles.chatBtnText}>Start Chatting</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.laterBtn} onPress={onClose}>
            <Text style={styles.laterBtnText}>Maybe Later</Text>
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
    borderColor: colors.primary,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  photos: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  photoWrap: {
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  photo: {
    width: 100,
    height: 100,
  },
  heartContainer: {
    marginHorizontal: 12,
  },
  heart: {
    fontSize: 28,
  },
  chatBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  chatBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  laterBtn: {
    paddingVertical: 10,
  },
  laterBtnText: {
    color: colors.textMuted,
    fontSize: 15,
  },
});

export default MatchModal;
