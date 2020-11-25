const puppeteerPreset = require('jest-puppeteer/jest-preset')

module.exports = {
  ...puppeteerPreset,
  verbose: false,
  testTimeout: 30000,
  testPathIgnorePatterns: ['/node_modules/'],
}
