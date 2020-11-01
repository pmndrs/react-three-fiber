const { setup: setupDevServer } = require('jest-dev-server')

module.exports = async function globalSetup() {
  await setupDevServer({
    command: `yarn start --port=3001`,
    launchTimeout: 50000,
    port: 3001,
  })
}
