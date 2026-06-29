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
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { loadMessages, setTyping, setActiveMatch, Message } from '../redux/slices/messagesSlice';
import { clearUnread } from '../redux/slices/matchesSlice';
import { getSocket } from '../services/socketService';
import { colors } from '../theme/colors';
import { Match } from '../redux/slices/matchesSlice';

interface ChatScreenProps {
  route: { params: { match: Match } };
  navigation: any;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ route, navigation }) => {
  const { match } = route.params;
  const dispatch = useAppDispatch();
  const sessionUserId = useAppSelector((s) => s.session.userId);
  const sessionPhoto = useAppSelector((s) => s.session.photo);
  const messages = useAppSelector((s) => s.messages.byMatchId[match.id] || []);
  const typingPartners = useAppSelector((s) => s.messages.typingPartners);
  const loading = useAppSelector((s) => s.messages.loading);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const socket = getSocket();

  // Incoming messages are handled globally (RealtimeManager) and land in the
  // store; here we only load history and listen for typing indicators.
  useEffect(() => {
    dispatch(loadMessages(match.id));

    const onTypingStart = ({ userId }: { userId: string }) =>
      dispatch(setTyping({ userId, typing: true }));
    const onTypingStop = ({ userId }: { userId: string }) =>
      dispatch(setTyping({ userId, typing: false }));

    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);

    return () => {
      socket.off('typing_start', onTypingStart);
      socket.off('typing_stop', onTypingStop);
    };
  }, [match.id]);

  // While this chat is focused, mark it active (suppresses its badge) and clear
  // any pending unread count.
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

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    socket.emit('send_message', { matchId: match.id, content: text, senderId: sessionUserId });
  };

  const isTyping = typingPartners.includes(match.partner_id);

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.sender_id === sessionUserId;
    return (
      <View style={[styles.msgRow, isOwn ? styles.ownRow : styles.theirRow]}>
        {!isOwn && (
          <Image source={{ uri: match.partner_photo }} style={styles.msgAvatar} />
        )}
        <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.theirBubble]}>
          <Text style={[styles.msgText, isOwn ? styles.ownText : styles.theirText]}>
            {item.content}
          </Text>
        </View>
        {isOwn && (
          <Image source={{ uri: sessionPhoto }} style={styles.msgAvatarOwn} />
        )}
      </View>
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
        <Image source={{ uri: match.partner_photo }} style={styles.headerAvatar} />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{match.partner_name}</Text>
          <Text style={styles.headerStatus}>
            {isTyping ? 'typing...' : 'online'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingRow}>
                <Image source={{ uri: match.partner_photo }} style={styles.msgAvatar} />
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
          placeholder="Type a message..."
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
