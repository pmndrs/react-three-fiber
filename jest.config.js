/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^three$': '<rootDir>/node_modules/three/build/three.cjs',
    // TODO: instead have Jest parse the JS bundle as ESM
    '^[^\\w]+react-reconciler(/index.js)?$': 'react-reconciler',
  },
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/packages/fiber/dist',
    '<rootDir>/packages/fiber/src/index',
    '<rootDir>/packages/test-renderer/dist',
  ],
  coverageDirectory: './coverage/',
  collectCoverage: false,
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  verbose: false,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/packages/shared/setupTests.ts'],
}
