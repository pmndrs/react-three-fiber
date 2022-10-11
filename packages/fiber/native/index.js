const { Platform } = require('react-native')

module.exports =
  Platform.OS === 'web'
    ? require('../dist/react-three-fiber.cjs.js')
    : require('./dist/react-three-fiber-native.cjs.js')
