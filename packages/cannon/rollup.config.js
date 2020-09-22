import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import { terser } from 'rollup-plugin-terser'
import worker from 'rollup-plugin-web-worker-loader'

const external = ['react', 'react-three-fiber', 'three']
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']

const getBabelOptions = ({ useESModules }, targets) => ({
  babelrc: false,
  extensions,
  include: ['src/**/*', '**/node_modules/**'],
  runtimeHelpers: true,
  presets: [
    ['@babel/preset-env', { loose: true, modules: false, targets }],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
})

export default [
  {
    input: `./src/index.tsx`,
    output: { dir: 'dist', format: 'esm' },
    external,
    plugins: [
      worker({ targetPlatform: 'browser', pattern: /.*\/worker$/ }),
      resolve({ extensions }),
      babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
      terser(),
    ],
  },
  {
    input: `./src/index.tsx`,
    output: { dir: 'dist/debug', format: 'esm' },
    external,
    plugins: [
      worker({ targetPlatform: 'browser', pattern: /.*\/worker$/ }),
      resolve({ extensions }),
      babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
    ],
  },
]
