import { registerRootComponent } from 'expo';

import App from './App';
import { APP_BRAND } from './src/config/brand';

// Web-only layout + meta fixes. Expo regenerates index.html for web exports, so
// the brand <title> and SVG favicon from index.html are re-asserted here at RUNTIME,
// which is what the live browser actually renders.
if (typeof document !== 'undefined') {
  const head = document.head;

  // Fix: ensure root element uses flex-direction column on web and fills the viewport
  const style = document.createElement('style');
  style.textContent = 'html, body, #root { height: 100%; margin: 0; padding: 0; } #root { display: flex !important; flex-direction: column !important; }';
  head.appendChild(style);

  // Invented FreeMatch logo (heart + match spark). Add the SVG link explicitly so
  // the browser tab favicon is our brand icon rather than expo's default favicon.ico.
  if (!document.querySelector('link[rel="icon"][type="image/svg+xml"]')) {
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/svg+xml';
    icon.href = '/favicon.svg';
    head.appendChild(icon);
  }

  // Belt-and-suspenders: always show the product name in the tab.
  document.title = APP_BRAND;
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
