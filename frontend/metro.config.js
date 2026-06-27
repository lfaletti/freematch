const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude jest temp directories from Metro's file watcher to prevent crashes
// when jest creates/deletes temp node_modules during test runs.
config.resolver.blockList = [
  /node_modules\/@types\/\.jest-.*/,
];

module.exports = config;
