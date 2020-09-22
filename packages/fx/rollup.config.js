import path from 'path'
import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import { terser } from 'rollup-plugin-terser'
import { sizeSnapshot } from 'rollup-plugin-size-snapshot'

const root = process.platform === 'win32' ? path.resolve('/') : '/'
const external = (id) => !id.startsWith('.') && !id.startsWith(root)
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']

const getBabelOptions = ({ useESModules }, targets) => ({
  babelrc: false,
  extensions,
  exclude: '**/node_modules/**',
  babelHelpers: 'runtime',
  presets: [
    ['@babel/preset-env', { loose: true, modules: false, targets }],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
  plugins: [['@babel/transform-runtime', { regenerator: false, useESModules }]],
})

export default [
  {
    input: `./src/index.tsx`,
    output: { file: `dist/index.js`, format: 'esm' },
    external,
    plugins: [
      json(),
      babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
      sizeSnapshot(),
      resolve({ extensions }),
      terser(),
    ],
  },
  {
    input: `./src/index.tsx`,
    output: { file: `dist/index.cjs.js`, format: 'cjs' },
    external,
    plugins: [
      json(),
      babel(getBabelOptions({ useESModules: false })),
      sizeSnapshot(),
      resolve({ extensions }),
      terser(),
    ],
  },
]
