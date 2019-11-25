import path from 'path'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import json from 'rollup-plugin-json'
import compiler from '@ampproject/rollup-plugin-closure-compiler'
import { sizeSnapshot } from 'rollup-plugin-size-snapshot'

const root = process.platform === 'win32' ? path.resolve('/') : '/'
const external = id => !id.startsWith('.') && !id.startsWith(root)
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']

const getBabelOptions = ({ useESModules }, targets) => ({
  babelrc: false,
  extensions,
  exclude: '**/node_modules/**',
  runtimeHelpers: true,
  presets: [
    ['@babel/preset-env', { loose: true, modules: false, targets }],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
  plugins: [
    ['transform-react-remove-prop-types', { removeImport: true }],
    ['@babel/transform-runtime', { regenerator: false, useESModules }],
  ],
})

function createConfig(entry, out) {
  return [
    {
      input: `./src/${entry}`,
      output: { file: `dist/${out}.js`, format: 'esm' },
      external,
      plugins: [
        json(),
        babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
        sizeSnapshot(),
        resolve({ extensions }),
        //compiler(),
      ],
    },
    {
      input: `./src/${entry}`,
      output: { file: `dist/${out}.cjs.js`, format: 'cjs' },
      external,
      plugins: [json(), babel(getBabelOptions({ useESModules: false })), sizeSnapshot(), resolve({ extensions })],
    },
  ]
}

export default [
  ...createConfig('targets/web', 'web'),
  ...createConfig('targets/svg', 'svg'),
  ...createConfig('targets/css2d', 'css2d'),
  ...createConfig('targets/css3d', 'css3d'),
  //...createConfig('extras/index', 'extras'),
  ...createConfig('targets/native/index', 'native'),
]
