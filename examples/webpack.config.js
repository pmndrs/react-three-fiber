const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')
const fs = require('fs')

const createAlias = (name, fallback) =>
  fs.existsSync(`./../../${name}`) ? path.resolve(`./../../${name}`) : fallback || name

module.exports = mode => {
  return {
    mode,
    entry: 'index.js',
    output: { filename: 'bundle.js', path: path.resolve('./dist') },
    module: {
      rules: [
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
        {
          test: /\.(js|jsx|tsx|ts)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              presets: [
                [
                  '@babel/preset-env',
                  {
                    modules: false,
                    loose: true,
                    useBuiltIns: false,
                    targets: { browsers: 'last 2 Chrome versions' },
                  },
                ],
                '@babel/preset-react',
                '@babel/preset-typescript',
              ],
              plugins: [
                '@babel/plugin-syntax-dynamic-import',
                ['@babel/plugin-proposal-class-properties', { loose: true }],
              ],
            },
          },
        },
        {
          test: /\.(gif|png|jpe?g|svg)$/i,
          use: ['file-loader', { loader: 'image-webpack-loader' }],
        },
      ],
    },
    resolve: {
      modules: [path.resolve('./'), 'node_modules'],
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      alias: {
        'react-three-fiber': path.resolve(`./../index.js`),
        react: path.resolve('node_modules/react'),
        'react-dom': path.resolve('node_modules/react-dom'),
        'prop-types': path.resolve('node_modules/prop-types'),
        three: path.resolve('node_modules/three/src/Three'),
        lodash: path.resolve('../node_modules/lodash-es'),
        'lodash-es': path.resolve('../node_modules/lodash-es'),
        'react-spring/three': createAlias('react-spring/src/targets/three', 'react-spring/three'),
      },
    },
    plugins: [new HtmlWebpackPlugin({ template: 'public/index.html' })],
    devServer: { hot: false, contentBase: path.resolve('./'), stats: 'errors-only' },
    devtool: undefined,
    performance: { hints: false },
  }
}
