const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const sdkPath = path.resolve("C:/app-inji/sdkdoscm/inji-wallet-sdk");

const config = getDefaultConfig(__dirname);

config.watchFolders = [sdkPath];

const projectNodeModules = path.resolve(__dirname, "node_modules");
config.resolver.extraNodeModules = new Proxy(
  { "@br.gov.dataprev.inji/wallet-sdk": sdkPath },
  {
    get: (target, name) =>
      name in target
        ? target[name]
        : path.join(projectNodeModules, name),
  }
);

// SVG transformer
config.transformer.babelTransformerPath = require.resolve(
  "react-native-svg-transformer",
);
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

module.exports = config;
