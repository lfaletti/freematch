import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import WelcomeScreen from '../screens/WelcomeScreen';
import CreateAccountScreen from '../screens/CreateAccountScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import MatchesScreen from '../screens/MatchesScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PhotoScreen from '../screens/PhotoScreen';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { setSession, clearSession } from '../redux/slices/sessionSlice';
import { validateToken } from '../services/authService';
import { getRefreshToken, clearTokens } from '../services/storageService';
import { refreshToken } from '../services/authService';
import { colors } from '../theme/colors';
import { initializeSocket, disconnectSocket } from '../services/socketService';
import { loadMatches } from '../redux/slices/matchesSlice';

const Stack = createNativeStackNavigator();

const initSession = async (dispatch: any) => {
  try {
    const storedRefreshToken = await getRefreshToken();
    if (!storedRefreshToken) {
      dispatch(clearSession());
      return;
    }

    const data = await refreshToken(storedRefreshToken);
    if (data?.token && data.refreshToken) {
      // Validate to get full user profile
      const profile = await validateToken(data.token);
      dispatch(
        setSession({
          userId: profile.userId,
          name: profile.name,
          photo: profile.photo_url,
          bio: profile.bio,
          bornDate: profile.born_date,
          phoneNumber: profile.phone_number,
          email: profile.email,
          token: data.token,
          refreshToken: data.refreshToken,
          slot: '',
          gender: profile.gender,
          seekingGender: profile.seekingGender,
        }),
      );
    } else {
      dispatch(clearSession());
    }
  } catch (err) {
    dispatch(clearSession());
  }
};

function RootNavigator() {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.session);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initSession(dispatch).finally(() => setInitializing(false));
  }, [dispatch]);

  useEffect(() => {
    if (session.isAuthenticated && session.token) {
      initializeSocket(session.token, session.userId);
      dispatch(loadMatches(session.userId));
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [session.isAuthenticated, session.token, session.userId, dispatch]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {session.isAuthenticated ? (
          <>
            <Stack.Screen name="Home">
              {(props) => (
                <HomeScreen
                  {...props}
                  sessionName={session.name}
                  sessionUserId={session.userId}
                  sessionPhoto={session.photo}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Matches" component={MatchesScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Photos" component={PhotoScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
