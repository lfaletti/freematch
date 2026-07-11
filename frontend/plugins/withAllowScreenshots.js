// Disables FLAG_SECURE on Android to allow screenshots
const { withAndroidManifest } = require('@expo/config-plugins');

function withAllowScreenshots(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const activities = androidManifest.manifest.application?.[0]?.activity || [];
    activities.forEach((activity) => {
      if (activity['$']?.['android:name'] === '.MainActivity') {
        // Remove any existing secure flag
        delete activity['$']['android:secure'];
      }
    });
    return config;
  });
}

module.exports = withAllowScreenshots;
