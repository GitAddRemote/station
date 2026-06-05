import type { Config } from 'jest';

const config: Config = {
  rootDir: 'src',
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['**/*.test.tsx', '**/*.test.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/../tsconfig.jest.json',
      },
    ],
  },
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^\\.\\./config/api$': '<rootDir>/__mocks__/config/api.ts',
  },
};

export default config;
