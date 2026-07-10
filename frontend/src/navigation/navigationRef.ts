import { createNavigationContainerRef } from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: undefined;
  Profile: {
    partnerId: string;
    name: string;
    age: number;
    photo: string;
    bio: string;
    location: string;
    interests: string[];
  };
  Matches: { screen: string; params?: Record<string, unknown> };
};

// Shared navigation ref so non-screen components (e.g. the global match modal,
// triggered by a realtime event) can navigate without a `navigation` prop.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function navigate(name: string, params?: any) {
  if (navigationRef.isReady()) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigationRef as any).navigate(name, params);
  }
}
