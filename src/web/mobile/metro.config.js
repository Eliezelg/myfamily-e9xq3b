/**
 * Metro configuration for MyFamily Mobile Application
 * @version 0.72.0
 * 
 * Advanced configuration for:
 * - Module resolution with Node.js polyfills
 * - Asset handling (images, fonts, localization)
 * - Multi-language support across 8 languages
 * - Optimized bundling and transformation
 */

const { getDefaultConfig } = require('@react-native/metro-config'); // v0.72.0

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig();

  return {
    resolver: {
      // Node.js module polyfills for React Native compatibility
      extraNodeModules: {
        crypto: 'react-native-crypto',
        stream: 'readable-stream',
        path: 'path-browserify'
      },
      // Extended asset extensions for comprehensive media support
      assetExts: [
        ...defaultConfig.resolver.assetExts,
        'ttf',  // Custom fonts
        'png',  // Raster images
        'svg',  // Vector graphics
        'jpg',  // Compressed images
        'json', // Configuration and data files
        'webp', // Optimized web images
        'gif'   // Animated graphics
      ],
      // Source file extensions for TypeScript and JavaScript
      sourceExts: [
        ...defaultConfig.resolver.sourceExts,
        'js',
        'jsx',
        'ts',
        'tsx',
        'json'
      ]
    },

    transformer: {
      // Babel transformer configuration for modern JavaScript features
      babelTransformerPath: 'metro-babel-transformer',
      
      // Asset plugins for optimized resource handling
      assetPlugins: ['metro-asset-plugin'],
      
      // Minification configuration for production builds
      minifierConfig: {
        compress: true,
        mangle: true,
        output: {
          ascii_only: true,    // Ensure ASCII-safe output
          quote_style: 3,      // Consistent quote style
          wrap_iife: true      // Secure function wrapping
        }
      }
    },

    // Watch folders for development hot reloading
    watchFolders: [
      // Shared assets directory for images, fonts, and media
      require('path').resolve(__dirname, '../src/assets'),
      // Localization files for multi-language support
      require('path').resolve(__dirname, '../src/locales'),
      // Node modules for dependencies
      require('path').resolve(__dirname, '../../node_modules')
    ]
  };
})();