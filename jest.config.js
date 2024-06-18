module.exports = {
  preset: 'ts-jest',
  testEnvironment: '<rootDir>/packages/shared/ExtendedJSDOMEnvironment.ts',
  testPathIgnorePatterns: ['/node_modules/'],
  coveragePathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/packages/fiber/dist',
    '<rootDir>/packages/fiber/src/index',
    '<rootDir>/packages/test-renderer/dist',
    '<rootDir>/test-utils',
  ],
  coverageDirectory: './coverage/',
  collectCoverage: false,
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  verbose: false,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/packages/shared/setupTests.ts'],
}
