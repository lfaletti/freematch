import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import WelcomeScreen from '../screens/WelcomeScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import HomeScreen from '../screens/HomeScreen';
import MatchesScreen from '../screens/MatchesScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PhotoScreen from '../screens/PhotoScreen';
import LegalScreen from '../screens/LegalScreen';
import DonationScreen from '../screens/DonationScreen';
import RealtimeManager from '../components/RealtimeManager';
import GlobalMatchModal from '../components/GlobalMatchModal';
import GlobalUnmatchModal from '../components/GlobalUnmatchModal';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setSession, clearSession } from '../redux/slices/sessionSlice';
import { validateToken, refreshToken } from '../services/authService';
import { storageService } from '../services/storageService';
import { colors } from '../theme/colors';
import { loadMatches } from '../redux/slices/matchesSlice';
import i18n, { loadSavedLanguage, Language } from '../i18n';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const initSession = async (dispatch: any) => {
  try {
    const storedRefreshToken = await storageService.getRefreshToken();
    if (!storedRefreshToken) {
      dispatch(clearSession());
      return;
    }

    const data = await refreshToken(storedRefreshToken);
    if (data?.token && data.refreshToken) {
      // Persist the rotated tokens before validating so the interceptor
      // and any subsequent request use the fresh credentials.
      await storageService.setToken(data.token);
      await storageService.setRefreshToken(data.refreshToken);

      const profile = await validateToken(data.token);
      const profileLang: Language = profile.language === 'en' ? 'en' : 'es';
      await i18n.changeLanguage(profileLang);
      dispatch(
        setSession({
          userId: profile.userId,
          name: profile.name,
          photo: profile.photo,
          bio: profile.bio,
          bornDate: profile.bornDate,
          phoneNumber: profile.phoneNumber,
          email: profile.email,
          token: data.token,
          refreshToken: data.refreshToken,
          slot: profile.slot ?? '',
          location: profile.location,
          interests: profile.interests,
          gender: profile.gender,
          seekingGender: profile.seekingGender,
          language: profileLang,
        }),
      );
    } else {
      await storageService.clearTokens();
      dispatch(clearSession());
    }
  } catch (err) {
    await storageService.clearTokens();
    dispatch(clearSession());
  }
};

// The Matches tab is its own stack so the list, a conversation, and a
// partner's profile can push on top of each other while the tab bar stays put.
function MatchesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MatchesList" component={MatchesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen as React.ComponentType<any>} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

// The bottom footer: Discover (swipe deck), Matches, and Photos.
function TabNavigator() {
  const unreadCount = useAppSelector((s) =>
    Object.values(s.matches.unread).reduce((sum, n) => sum + n, 0)
  );
  const hasUnread = unreadCount > 0;
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tabs.discover'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔥</Text>,
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesStack}
        options={{
          tabBarLabel: t('tabs.matches'),
          tabBarBadge: hasUnread ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.primary, color: colors.white },
          // The heart turns into a love-letter while there are unread messages.
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22, color }}>{hasUnread ? '💌' : '❤️'}</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Photos"
        component={PhotoScreen}
        options={{
          tabBarLabel: t('tabs.photos'),
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📸</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen as React.ComponentType<any>} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen as React.ComponentType<any>} />
      <Stack.Screen name="Legal" component={LegalScreen} />
    </Stack.Navigator>
  );
}

// EditProfile and (self) Profile live above the tabs so they cover the footer.
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Donation" component={DonationScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ presentation: 'card' }} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.session);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      // Apply the user's saved language before first render to avoid a flash.
      const saved = await loadSavedLanguage();
      await i18n.changeLanguage(saved);
      await initSession(dispatch);
      setInitializing(false);
    })();
  }, [dispatch]);

  // Load the match list on login; RealtimeManager owns the socket lifecycle.
  useEffect(() => {
    if (session.isAuthenticated) {
      dispatch(loadMatches());
    }
  }, [session.isAuthenticated, dispatch]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {session.isAuthenticated ? (
        <>
          <RealtimeManager />
          <AppStack />
          <GlobalMatchModal />
          <GlobalUnmatchModal />
        </>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

export default RootNavigator;
