module.exports = {
  // @typescript-eslint/parser v5.50.0 - TypeScript parser for ESLint
  parser: '@typescript-eslint/parser',
  
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    },
    project: './tsconfig.json'
  },

  settings: {
    react: {
      version: 'detect'
    }
  },

  // Plugins
  plugins: [
    '@typescript-eslint', // v5.50.0 - TypeScript-specific linting rules
    'react', // v7.32.0 - React-specific linting rules
    'react-hooks', // v4.6.0 - React hooks linting rules
    'jsx-a11y', // v6.7.0 - Accessibility linting rules
    'i18n-json' // v3.1.0 - Internationalization linting support
  ],

  // Extended configurations
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier' // v8.6.0 - Prettier integration
  ],

  // Custom rule configurations
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_' 
    }],

    // React specific rules
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Accessibility rules for elderly users
    'jsx-a11y/click-events-have-key-events': 'error',
    'jsx-a11y/no-noninteractive-element-interactions': 'error',
    'jsx-a11y/aria-props': 'error',
    'jsx-a11y/aria-proptypes': 'error',
    'jsx-a11y/aria-unsupported-elements': 'error',
    'jsx-a11y/role-has-required-aria-props': 'error',

    // General code quality rules
    'no-console': ['warn', { 
      allow: ['warn', 'error'] 
    }],
    'eqeqeq': 'error',
    'no-var': 'error',
    'prefer-const': 'error'
  },

  // Environment configuration
  env: {
    browser: true,
    es2020: true,
    node: true,
    jest: true
  },

  // Files to ignore
  ignorePatterns: [
    'node_modules',
    'build',
    'dist',
    'coverage',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/*.spec.ts',
    '**/*.spec.tsx'
  ]
};