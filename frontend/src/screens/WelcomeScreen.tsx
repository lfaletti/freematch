import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Linking } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

// Public repo README — the development story lives there.
const README_URL = 'https://github.com/lfaletti/freematch#readme';

export default function WelcomeScreen({ navigation }: Props) {
  const { t } = useTranslation();

  // On web this opens a new tab; on native it opens the system browser.
  const openReadme = () => {
    Linking.openURL(README_URL).catch(() => {
      // No-op: if the link can't open we just stay on the screen.
    });
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <Text style={styles.logoFlame}>🔥</Text>
          <View style={styles.logoHeart}>
            <Text style={styles.logoHeartText}>❤</Text>
          </View>
        </View>
        <Text style={styles.logoText}>{t('welcome.title')}</Text>
        <Text style={styles.tagline}>{t('welcome.tagline')}</Text>
        <View style={styles.pillars}>
          <Text style={styles.pillarItem}>• {t('home.noAlgorithms')}</Text>
          <Text style={styles.pillarItem}>• {t('home.noTracking')}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('CreateAccount')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>{t('welcome.createAccount')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>{t('welcome.login')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>
        <Text>{t('welcome.disclaimerPrefix')} </Text>
        <Text style={styles.disclaimerLink} onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
          {t('legal.terms')}
        </Text>
        <Text> {t('welcome.disclaimerAnd')} </Text>
        <Text style={styles.disclaimerLink} onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
          {t('legal.privacy')}
        </Text>
        <Text>{t('welcome.disclaimerSuffix')}</Text>
      </Text>

      <TouchableOpacity onPress={openReadme} activeOpacity={0.7} style={styles.devLinkWrap}>
        <Text style={styles.devLink}>
          {t('welcome.developersPrefix')}{' '}
          <Text style={styles.devLinkAccent}>{t('welcome.developersLink')}</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  hero: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoMark: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logoFlame: {
    fontSize: 52,
    lineHeight: 60,
  },
  logoHeart: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: colors.background,
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHeartText: {
    fontSize: 13,
    color: colors.primary,
    lineHeight: 16,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  pillars: {
    marginTop: 12,
    alignItems: 'center',
    gap: 6,
  },
  pillarItem: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 18,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  disclaimerLink: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  devLinkWrap: {
    marginTop: 10,
    paddingVertical: 4,
  },
  devLink: {
    color: '#6b7280',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  devLinkAccent: {
    color: '#6b7280',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
