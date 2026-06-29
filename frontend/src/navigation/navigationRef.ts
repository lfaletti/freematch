import { createNavigationContainerRef } from '@react-navigation/native';

// Shared navigation ref so non-screen components (e.g. the global match modal,
// triggered by a realtime event) can navigate without a `navigation` prop.
export const navigationRef = createNavigationContainerRef();

export function navigate(name: string, params?: object) {
  if (navigationRef.isReady()) {
    // @ts-expect-error - dynamic navigation target
    navigationRef.navigate(name, params);
  }
}
