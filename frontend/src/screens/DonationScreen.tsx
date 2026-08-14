import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { fetchDonationConfig, DonationConfig } from '../services/donationService';
import { colors } from '../theme/colors';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

// Opens the payment page. On web, RN Web exposes Linking.openURL which opens a
// new tab; on native it opens the system browser.
function openDonationUrl(baseUrl: string, amount: number | null) {
  let url = baseUrl;
  if (amount && amount > 0) {
    // Some providers accept an amount in the query string; harmless to append
    // if the provider ignores it. Keep the base URL validated/simple.
    const sep = url.includes('?') ? '&' : '?';
    url = `${url}${sep}amount=${encodeURIComponent(String(amount))}`;
  }
  Linking.openURL(url).catch(() => {
    // No-op: if the link can't open we just stay on the screen.
  });
}

export default function DonationScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<DonationConfig | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const cfg = await fetchDonationConfig();
        if (!cancelled) setConfig(cfg);
      } catch {
        if (!cancelled) {
          setError(t('donation.loadError'));
          setConfig(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not allowed (whitelist / flag gating) or failed to load → treat as closed.
  if (!config?.enabled || error) {
    return (
      <View style={styles.center}>
        <View style={styles.notAvailable}>
          <Text style={styles.notAvailableEmoji}>💜</Text>
          <Text style={styles.notAvailableTitle}>{t('donation.unavailableTitle')}</Text>
          <Text style={styles.notAvailableText}>{t('donation.unavailableText')}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const parsedAmount =
    amount.trim() === '' ? null : Number(amount.replace(/[^0-9.]/g, ''));

  const canDonate = config.baseUrl.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('donation.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>💜</Text>
          <Text style={styles.heroTitle}>{t('donation.heroTitle')}</Text>
          <Text style={styles.heroText}>{t('donation.heroText')}</Text>
        </View>

        <View style={styles.amountField}>
          <Text style={styles.label}>{t('donation.amountLabel')}</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>{config.currency}</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType={Platform.OS === 'web' ? 'numeric' : 'decimal-pad'}
              autoFocus={false}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.donateBtn, !canDonate && styles.donateBtnDisabled]}
          onPress={() => canDonate && openDonationUrl(config.baseUrl, parsedAmount)}
          disabled={!canDonate}
          activeOpacity={0.85}
        >
          <Text style={styles.donateBtnText}>
            {parsedAmount && parsedAmount > 0
              ? t('donation.ctaAmount', { amount: parsedAmount, currency: config.currency })
              : t('donation.cta', { currency: config.currency })}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>{t('donation.footnote')}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  backText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSpacer: {
    width: 48,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  heroText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
  },
  amountField: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  currency: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: 14,
  },
  donateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  donateBtnDisabled: {
    opacity: 0.5,
  },
  donateBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
  },
  footnote: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  notAvailable: {
    alignItems: 'center',
    maxWidth: 320,
  },
  notAvailableEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  notAvailableTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  notAvailableText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: colors.text,
    fontWeight: '600',
  },
});
