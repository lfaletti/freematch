import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import i18n from '../i18n';

type LegalParams = {
  Legal: { type: 'privacy' | 'terms' };
};
type LegalRouteProp = RouteProp<LegalParams, 'Legal'>;
type LegalNavProp = NativeStackNavigationProp<LegalParams, 'Legal'>;

// Minimal offline fallback so the consent screen never hangs on a network error.
const FALLBACK: Record<'privacy' | 'terms', Record<'es' | 'en', string>> = {
  privacy: {
    es:
      'Estamos cargando nuestra Política de Privacidad. Por favor revisá tu conexión e intentá de nuevo.',
    en: 'Loading our Privacy Policy. Please check your connection and try again.',
  },
  terms: {
    es: 'Estamos cargando los Términos de Servicio. Por favor revisá tu conexión e intentá de nuevo.',
    en: 'Loading our Terms of Service. Please check your connection and try again.',
  },
};

export default function LegalScreen() {
  const route = useRoute<LegalRouteProp>();
  const navigation = useNavigation<LegalNavProp>();
  const { t } = useTranslation();
  const { type } = route.params;

  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = async () => {
    setError(false);
    setContent(null);
    const lang = i18n.language === 'en' ? 'en' : 'es';
    try {
      const res = await api.get(`/api/legal/${type}?lang=${lang}`, { timeout: 15000 });
      setContent(res.data ?? '');
    } catch {
      setError(true);
      setContent(FALLBACK[type][lang]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const title = type === 'privacy' ? t('legal.privacy') : t('legal.terms');

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>{title}</Text>
        <View style={s.spacer} />
      </View>

      <ScrollView contentContainerStyle={s.content} style={s.scroll}>
        {content === null && !error ? (
          <ActivityIndicator color={colors.primary} size="large" style={s.loading} />
        ) : (
          <Text style={s.text}>{content}</Text>
        )}

        {error && (
          <TouchableOpacity style={s.retryBtn} onPress={load}>
            <Text style={s.retryText}>{t('home.retry')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, display: 'flex', flexDirection: 'column' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 12 : 60,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 32, color: colors.primary, lineHeight: 32 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginLeft: 12, flex: 1 },
  spacer: { width: 28 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  loading: { marginTop: 40 },
  text: { color: colors.text, fontSize: 15, lineHeight: 24 },
  retryBtn: {
    marginTop: 24,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  retryText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
