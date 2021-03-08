const { version } = require('./package.json')

const versionTransform = ({ types: t }) => ({
  visitor: {
    Identifier(path) {
      path.node.name === 'R3F_VERSION' && path.replaceWith(t.stringLiteral(version))
    },
  },
})

module.exports = {
  plugins: [versionTransform],
  presets: [
    [
      '@babel/preset-env',
      {
        bugfixes: true,
        loose: true,
        modules: false,
        targets: '> 0.25%, not dead, not ie 11, not op_mini all',
      },
    ],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
}
