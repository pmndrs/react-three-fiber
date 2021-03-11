module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['/node_modules/'],
  coveragePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/packages/fiber/dist'],
  // coverageThreshold: {
  //   global: {
  //     statements: 80,
  //     branches: 80,
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
