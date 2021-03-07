const { version } = require('./package.json');

const versionTransform = ({ types: t }) => ({
  visitor: {
    Identifier(path) {
      (path.node.name === 'R3F_VERSION') && path.replaceWith(t.stringLiteral(version));
    },
  },
})

module.exports = {
  plugins: [versionTransform],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          esmodules: true,
        },
      },
    ],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
}
