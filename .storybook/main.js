const path = require('path');

module.exports = {
  stories: ['./stories/**/*.stories.js'],
  addons: ['@storybook/addon-knobs/register', '@storybook/addon-actions', '@storybook/addon-storysource'],
  webpackFinal: config => {

    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: [
        'raw-loader',
        'glslify-loader'
      ],
      include: path.resolve(__dirname, '../'),
    })

    return config
  }
}
