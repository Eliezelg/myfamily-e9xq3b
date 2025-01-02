// ESLint configuration for MyFamily backend microservices
// @typescript-eslint/eslint-plugin v5.50.0
// @typescript-eslint/parser v5.50.0
// eslint-config-prettier v8.6.0
// eslint-plugin-import v2.27.5
// eslint-plugin-jest v27.2.1

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2022,
    sourceType: 'module',
    tsconfigRootDir: '.'
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'jest'
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:jest/recommended',
    'prettier'
  ],
  env: {
    node: true,
    jest: true,
    es2022: true
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',

    // Import/Export rules for microservices architecture
    'import/order': ['error', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      'alphabetize': { 'order': 'asc' }
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    'import/no-internal-modules': ['error', { 'allow': ['@internal/*'] }],

    // Jest testing rules
    'jest/expect-expect': 'error',
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/valid-expect': 'error',
    'jest/valid-title': 'error',

    // General code quality rules
    'no-console': ['error', { 'allow': ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    'no-unused-vars': 'off' // Handled by @typescript-eslint/no-unused-vars
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json'
      }
    }
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'jest/valid-title': 'error',
        'jest/prefer-expect-assertions': 'error',
        'jest/no-conditional-expect': 'error'
      }
    }
  ],
  ignorePatterns: [
    'dist',
    'node_modules',
    'coverage',
    '*.js',
    '*.d.ts'
  ]
};