module.exports = {
  launch: {
    // dumpio: true,
    headless: true,
    // slowMo: 250,
    // devtools: true,
    // waitUntil: 'networkidle2',
  },
  server: {
    command: 'yarn --cwd ./__tests__/src start',
    port: 8081,
  },
}
