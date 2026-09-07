import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { loadMatches, Match } from '../redux/slices/matchesSlice';
import { colors } from '../theme/colors';
import { getPhotoUrl } from '../services/api';
import { useTranslation } from 'react-i18next';

const MatchesScreen = ({ navigation }: { navigation: any }) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const sessionUserId = useAppSelector((s) => s.session.userId);
  const { all: matches, loading } = useAppSelector((s) => s.matches);

  useEffect(() => {
    if (!sessionUserId) return;
    dispatch(loadMatches());
  }, [sessionUserId]);

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchRow}
      onPress={() => navigation.navigate('Chat', { match: item })}
    >
      <TouchableOpacity
        style={styles.avatarWrap}
        onPress={() => navigation.navigate('Profile', {
          partnerId: item.partner_id,
          name: item.partner_name,
          age: item.partner_age,
          photo: item.partner_photo,
          bio: item.partner_bio,
          location: item.partner_location,
          interests: item.partner_interests,
        })}
      >
        <Image source={{ uri: getPhotoUrl(item.partner_photo) }} style={styles.avatar} />
        <View style={styles.onlineDot} />
      </TouchableOpacity>
      <View style={styles.info}>
        <Text style={styles.name}>{item.partner_name}, {item.partner_age}</Text>
        <Text style={styles.lastMsg} numberOfLines={1}>
          {item.last_message || t('matches.sayHello')}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('matches.title')}</Text>
        <Text style={styles.subtitle}>{t('matches.subtitle', { count: matches.length })}</Text>
      </View>
      {matches.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>💫</Text>
          <Text style={styles.emptyText}>{t('matches.empty')}</Text>
          <Text style={styles.emptySubtext}>{t('matches.emptySubtext')}</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  list: {
    padding: 16,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  lastMsg: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
    marginLeft: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: colors.textSecondary,
  },
});

export default MatchesScreen;
