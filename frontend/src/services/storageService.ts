import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = 'freematch_user_id';
const TOKEN_KEY = 'freematch_token';
const REFRESH_TOKEN_KEY = 'freematch_refresh_token';

export const storageService = {
  async getUserId(): Promise<string | null> {
    return AsyncStorage.getItem(USER_ID_KEY);
  },
  async setUserId(userId: string): Promise<void> {
    await AsyncStorage.setItem(USER_ID_KEY, userId);
  },
  async clearUserId(): Promise<void> {
    await AsyncStorage.removeItem(USER_ID_KEY);
  },
  
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  },
  async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  async clearTokens(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  },
  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(USER_ID_KEY);
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
