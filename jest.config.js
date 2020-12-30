const tsPreset = require('ts-jest/jest-preset')
const puppeteerPreset = require('jest-puppeteer/jest-preset')

module.exports = {
  ...tsPreset,
  ...puppeteerPreset,
  verbose: false,
  testTimeout: 30000,
  testPathIgnorePatterns: ['/node_modules/'],
}
