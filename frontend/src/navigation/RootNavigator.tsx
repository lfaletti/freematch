import React, { useEffect, useState } from 'react';
import { Platform, View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import MatchesScreen from '../screens/MatchesScreen';
import ChatScreen from '../screens/ChatScreen';
import PhotoScreen from '../screens/PhotoScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import LoginScreen from '../screens/LoginScreen';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setSession, clearSession } from '../redux/slices/sessionSlice';
import { switchUser } from '../services/userService';
import { storageService } from '../services/storageService';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import testUsers from '../config/testUsers.json';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const VALID_SLOTS = testUsers.map((u: { slot: string }) => u.slot);

function MatchesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MatchesList" component={MatchesScreen} />
      <Stack.Screen name="Chat" component={ChatScreen as React.ComponentType<any>} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
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
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔥</Text>,
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesStack}
        options={{
          tabBarLabel: 'Matches',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>❤️</Text>,
        }}
      />
      <Tab.Screen
        name="Photos"
        component={PhotoScreen}
        options={{
          tabBarLabel: 'Photos',
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
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.session.isAuthenticated);
  const token = useAppSelector((s) => s.session.token);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initSession();
  }, []);

  async function initSession() {
    try {
      if (Platform.OS === 'web') {
        const param = new URLSearchParams(window.location.search).get('user') ?? '';
        if (param && VALID_SLOTS.includes(param)) {
          const info = await switchUser(param);
          dispatch(setSession({
            userId: info.userId,
            slot: info.slot,
            name: info.name,
            photo: info.photo,
            bio: info.bio,
            bornDate: info.bornDate,
            phoneNumber: info.phoneNumber,
            email: info.email,
          }));
          setIsLoading(false);
          return;
        }
      }

      const savedToken = await storageService.getToken();
      const savedRefreshToken = await storageService.getRefreshToken();
      const storedUserId = await storageService.getUserId();

      if (savedToken && storedUserId) {
        const res = await api.get('/api/session', {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        const data = res.data;
        dispatch(setSession({
          userId: data.userId,
          slot: data.slot ?? '',
          name: data.name,
          photo: data.photo,
          bio: data.bio ?? '',
          bornDate: data.bornDate ?? '',
          phoneNumber: data.phoneNumber ?? '',
          email: data.email ?? '',
          token: savedToken,
          refreshToken: savedRefreshToken ?? '',
        }));
      } else if (storedUserId) {
        const res = await api.get('/api/session', {
          headers: { 'X-User-Id': storedUserId },
        });
        const data = res.data;
        dispatch(setSession({
          userId: data.userId,
          slot: data.slot ?? '',
          name: data.name,
          photo: data.photo,
          bio: data.bio ?? '',
          bornDate: data.bornDate ?? '',
          phoneNumber: data.phoneNumber ?? '',
          email: data.email ?? '',
        }));
      }
    } catch {
      try { await storageService.clearAll(); } catch { }
      dispatch(clearSession());
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator testID="loading-indicator" color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <TabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
}
