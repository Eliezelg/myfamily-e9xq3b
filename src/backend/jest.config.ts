import type { Config } from '@jest/types';
import { pathsToModuleNameMapper } from 'ts-jest';
// @jest/types version: ^29.4.0
// ts-jest version: ^29.4.0

const config: Config.InitialOptions = {
  // Use ts-jest as the default preset for TypeScript testing
  preset: 'ts-jest',

  // Set Node.js as the test environment
  testEnvironment: 'node',

  // Configure TypeScript path aliases for module resolution
  moduleNameMapper: {
    '@shared/(.*)': '<rootDir>/src/shared/$1',
    '@api-gateway/(.*)': '<rootDir>/src/api-gateway/src/$1',
    '@auth-service/(.*)': '<rootDir>/src/auth-service/src/$1',
    '@content-service/(.*)': '<rootDir>/src/content-service/src/$1',
    '@gazette-service/(.*)': '<rootDir>/src/gazette-service/src/$1',
    '@payment-service/(.*)': '<rootDir>/src/payment-service/src/$1',
    '@worker-service/(.*)': '<rootDir>/src/worker-service/src/$1',
  },

  // Test file patterns
  testMatch: [
    '**/*.test.ts',
    '**/*.spec.ts'
  ],

  // Coverage collection configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts'
  ],

  // Coverage reporting configuration
  coverageReporters: [
    'text',
    'lcov',
    'json',
    'html'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },

  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
    'node'
  ],

  // Test environment configuration
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,

  // Root directory for Jest
  rootDir: '.',

  // Global setup/teardown hooks
  globalSetup: '<rootDir>/src/test/setup.ts',
  globalTeardown: '<rootDir>/src/test/teardown.ts',

  // Custom reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'coverage/junit',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }]
  ]
};

export default config;