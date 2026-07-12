import { registerRootComponent } from 'expo';

import App from './App';

// Fix: ensure root element uses flex-direction column on web and fills the viewport
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'html, body, #root { height: 100%; margin: 0; padding: 0; } #root { display: flex !important; flex-direction: column !important; }';
  document.head.appendChild(style);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
