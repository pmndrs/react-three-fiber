module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/packages/fiber/dist',
    '<rootDir>/packages/fiber/src/index',
    '<rootDir>/packages/test-renderer/dist',
    '<rootDir>/test-utils',
  ],
  // coverageThreshold: {
  //   global: {
  //     statements: 80,
  //     branches: 68,
  //     functions: 80,
  //     lines: 80,
  //   },
  // },
  coverageDirectory: './coverage/',
  collectCoverage: true,
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  verbose: false,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
}
