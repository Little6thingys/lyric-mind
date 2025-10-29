// config-overrides.js
const webpack = require("webpack");

module.exports = function override(config) {
  // Add browser fallbacks for Node.js core modules
  config.resolve.fallback = {
    ...(config.resolve.fallback || {}),
    fs: false, // fs cannot run in the browser
    path: require.resolve("path-browserify"),
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    buffer: require.resolve("buffer/"),
  };

  // Polyfill globals like "process" and "Buffer"
  config.plugins = (config.plugins || []).concat([
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
      process: "process/browser",
    }),
  ]);

  return config;
};
