import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { loadMessages, setTyping, setActiveMatch, removeMatchMessages, Message, toggleLike, replaceMessage } from '../redux/slices/messagesSlice';
import { clearUnread, removeMatch } from '../redux/slices/matchesSlice';
import { loadUsers } from '../redux/slices/usersSlice';
import { getSocket } from '../services/socketService';
import { unmatch } from '../services/userService';
import ConfirmModal from '../components/ConfirmModal';
import { colors } from '../theme/colors';
import { Match } from '../redux/slices/matchesSlice';
import { getPhotoUrl } from '../services/api';
import { replaceEmoticons } from '../utils/emoticons';

interface ChatScreenProps {
  route: { params: { match: Match } };
  navigation: any;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { match } = route.params;
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const sessionUserId = useAppSelector((s) => s.session.userId);
  const sessionPhoto = useAppSelector((s) => s.session.photo);
  const messages = useAppSelector((s) => s.messages.byMatchId[match.id] || []);
  const typingPartners = useAppSelector((s) => s.messages.typingPartners);
  const loading = useAppSelector((s) => s.messages.loading);
  const [inputText, setInputText] = useState('');
  const [confirmUnmatch, setConfirmUnmatch] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const lastTapRef = useRef<number>(0);
  const socket = getSocket();

  // Sync local state with Redux messages
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    dispatch(loadMessages(match.id));

    const onTypingStart = ({ userId }: { userId: string }) =>
      dispatch(setTyping({ userId, typing: true }));
    const onTypingStop = ({ userId }: { userId: string }) =>
      dispatch(setTyping({ userId, typing: false }));
    // Realtime like updates: when the other participant likes/unlikes a message,
    // replace it so the heart count reflects immediately without a refresh.
    const onMessageLiked = (message: Message) => dispatch(replaceMessage(message));
    const onMessageUnliked = (message: Message) => dispatch(replaceMessage(message));

    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);
    socket.on('message_liked', onMessageLiked);
    socket.on('message_unliked', onMessageUnliked);

    return () => {
      socket.off('typing_start', onTypingStart);
      socket.off('typing_stop', onTypingStop);
      socket.off('message_liked', onMessageLiked);
      socket.off('message_unliked', onMessageUnliked);
    };
  }, [match.id]);

  useFocusEffect(
    useCallback(() => {
      dispatch(setActiveMatch(match.id));
      dispatch(clearUnread(match.id));
      return () => {
        dispatch(setActiveMatch(null));
      };
    }, [match.id])
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleUnmatch = async () => {
    setConfirmUnmatch(false);
    try {
      await unmatch(match.id);
    } catch (err) {
      console.error('Failed to unmatch:', err);
    }
    dispatch(removeMatch(match.id));
    dispatch(removeMatchMessages(match.id));
    dispatch(loadUsers());
    navigation.goBack();
  };

  const sendMessage = () => {
    const text = replaceEmoticons(inputText.trim());
    if (!text) return;
    setInputText('');
    socket.emit('send_message', { matchId: match.id, content: text, senderId: sessionUserId });
  };

  // Double tap detection for likes
  const handlePress = (message: Message) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected - call handleDoubleTap
      handleDoubleTap(message);
    }
    lastTapRef.current = now;
  };

  // Optimistic UI: toggle like immediately on local state BEFORE Redux dispatch
  const handleDoubleTap = (message: Message) => {
    const isLiked = message.liked_by?.includes(sessionUserId);
    const newLikeStatus = !isLiked;
    
    // Update local state immediately for instant feedback
    setLocalMessages((prev) =>
      prev.map((msg) =>
        msg.id === message.id
          ? {
              ...msg,
              liked_by: newLikeStatus
                ? [...(msg.liked_by || []), sessionUserId]
                : (msg.liked_by || []).filter((id) => id !== sessionUserId),
            }
          : msg
      )
    );
    
    // Then dispatch to Redux for API call
    dispatch(toggleLike({ messageId: message.id, matchId: match.id, like: newLikeStatus, userId: sessionUserId }));
  };

  const isTyping = typingPartners.includes(match.partner_id);

  // Format the message timestamp as HH:MM (24h). Falls back to an empty string.
  const formatTime = (iso?: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === sessionUserId;
    const hasLikes = item.liked_by && item.liked_by.length > 0;
    const isLikedByMe = item.liked_by?.includes(sessionUserId);
    
    return (
      <TouchableOpacity
        onPress={() => handlePress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.msgRow, isOwn ? styles.ownRow : styles.theirRow]}>
          {!isOwn && (
            <Image source={{ uri: getPhotoUrl(match.partner_photo) }} style={styles.msgAvatar} />
          )}
          <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.theirBubble]}>
            <Text style={[styles.msgText, isOwn ? styles.ownText : styles.theirText]}>
              {replaceEmoticons(item.content)}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.timeText, isOwn ? styles.ownMeta : styles.theirMeta]}>
                {formatTime(item.created_at)}
              </Text>
              {hasLikes && (
                <View style={styles.likesRow}>
                  <Text style={styles.likesText}>
                    {isLikedByMe ? '❤️' : '🤍'} {item.liked_by.length}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {isOwn && (
            <Image source={{ uri: sessionPhoto }} style={styles.msgAvatarOwn} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile', {
            partnerId: match.partner_id,
            name: match.partner_name,
            age: match.partner_age,
            photo: match.partner_photo,
            bio: match.partner_bio,
            location: match.partner_location,
            interests: match.partner_interests,
          })}
        >
          <Image source={{ uri: getPhotoUrl(match.partner_photo) }} style={styles.headerAvatar} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerInfo}
          onPress={() => navigation.navigate('Profile', {
            partnerId: match.partner_id,
            name: match.partner_name,
            age: match.partner_age,
            photo: match.partner_photo,
            bio: match.partner_bio,
            location: match.partner_location,
            interests: match.partner_interests,
          })}
        >
          <Text style={styles.headerName}>{match.partner_name}</Text>
          <Text style={styles.headerStatus}>
            {isTyping ? 'typing...' : 'online'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setConfirmUnmatch(true)} style={styles.unmatchBtn}>
          <Text style={styles.unmatchIcon}>💔</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={localMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingRow}>
                <Image source={{ uri: getPhotoUrl(match.partner_photo) }} style={styles.msgAvatar} />
                <View style={styles.typingBubble}>
                  <Text style={styles.typingDots}>•••</Text>
                </View>
              </View>
            ) : null
          }
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('matches.typeMessage')}
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          multiline
          blurOnSubmit={false}
          onKeyPress={(e: any) => {
            if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
              e.preventDefault?.();
              sendMessage();
            }
          }}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>

      <ConfirmModal
        visible={confirmUnmatch}
        title={t('matches.unmatchTitle')}
        message={t('matches.unmatchMessage', { name: match.partner_name })}
        confirmText={t('matches.unmatchConfirm')}
        cancelText={t('common.cancel')}
        destructive
        onConfirm={handleUnmatch}
        onCancel={() => setConfirmUnmatch(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 16 : 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    marginRight: 8,
    padding: 4,
  },
  backIcon: {
    fontSize: 32,
    color: colors.primary,
    lineHeight: 32,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  headerInfo: {
    marginLeft: 10,
  },
  unmatchBtn: {
    marginLeft: 'auto',
    padding: 6,
  },
  unmatchIcon: {
    fontSize: 22,
  },
  headerName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  headerStatus: {
    fontSize: 12,
    color: colors.success,
    marginTop: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  ownRow: {
    justifyContent: 'flex-end',
  },
  theirRow: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  msgAvatarOwn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 8,
  },
  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: colors.surfaceLight,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 21,
  },
  ownText: {
    color: colors.white,
  },
  theirText: {
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  likesText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  ownMeta: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirMeta: {
    color: colors.textMuted,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  typingBubble: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
  },
  typingDots: {
    color: colors.textMuted,
    fontSize: 18,
    letterSpacing: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: colors.white,
    fontSize: 18,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatScreen;
