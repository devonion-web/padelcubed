const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Exclude zxing-wasm temporary directories that metro tries to watch
// but are deleted by the package's post-install script, causing ENOENT crashes.
const { resolver } = config;
const blockList = resolver?.blockList
  ? Array.isArray(resolver.blockList)
    ? resolver.blockList
    : [resolver.blockList]
  : [];

config.resolver = {
  ...resolver,
  blockList: [
    ...blockList,
    /zxing-wasm_tmp_/,
  ],
};

// Monorepo: watch the workspace root so cross-package imports resolve
const workspaceRoot = path.resolve(__dirname, '../..');
config.watchFolders = [workspaceRoot];

module.exports = config;
