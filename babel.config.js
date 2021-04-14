module.exports = {
  plugins: [],
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
