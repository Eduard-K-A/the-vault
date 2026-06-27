import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/test/unit/**/*.test.ts',
    '<rootDir>/test/components/**/*.test.tsx',
    '<rootDir>/test/integration/**/*.test.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@powersync/react-native$': '<rootDir>/test/__mocks__/powersync.ts',
    '^@powersync/react$': '<rootDir>/test/__mocks__/powersync.ts',
    '^@supabase/supabase-js$': '<rootDir>/test/__mocks__/supabase.ts',
    '^expo-secure-store$': '<rootDir>/test/__mocks__/expoModules.ts',
    '^expo-file-system$': '<rootDir>/test/__mocks__/expoModules.ts',
    '^expo-sharing$': '<rootDir>/test/__mocks__/expoModules.ts',
    '^expo-image-picker$': '<rootDir>/test/__mocks__/expoImagePicker.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/navigationTypes.ts',
    '!src/types/**',
  ],
  coverageProvider: 'babel',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|expo(nent)?|expo-modules-core|expo-modules-autolinking|@expo(nent)?/.*|@expo/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)/)',
  ],
};

export default config;
