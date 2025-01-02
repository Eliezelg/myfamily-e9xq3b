// @babel/preset-env ^7.20.0
// @babel/preset-react ^7.18.6
// @babel/preset-typescript ^7.20.0

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        // Configure browser targets based on browserslist config
        targets: {
          browsers: [
            '>0.2%',
            'not dead',
            'not op_mini all'
          ]
        },
        // Enable automatic module format detection
        modules: 'auto',
        // Enable polyfills injection based on usage
        useBuiltIns: 'usage',
        // Use latest CoreJS 3 for polyfills
        corejs: 3
      }
    ],
    [
      '@babel/preset-react',
      {
        // Use new JSX transform from React 17+
        runtime: 'automatic',
        // Enable development mode for better debugging
        development: true
      }
    ],
    [
      '@babel/preset-typescript',
      {
        // Enable TSX support
        isTSX: true,
        // Apply TypeScript transformations to all file extensions
        allExtensions: true,
        // Enable TypeScript namespace support
        allowNamespaces: true
      }
    ]
  ],

  // Environment-specific configurations
  env: {
    production: {
      presets: [
        [
          '@babel/preset-react',
          {
            runtime: 'automatic',
            // Disable development mode in production
            development: false
          }
        ]
      ]
    },
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            // Target current Node version in test environment
            targets: {
              node: 'current'
            }
          }
        ]
      ]
    }
  }
};