import path from 'path'
import { promises as fs } from 'fs'
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import json from 'rollup-plugin-json'
import { sizeSnapshot } from 'rollup-plugin-size-snapshot'
import compiler from '@ampproject/rollup-plugin-closure-compiler'
import commonjs from '@rollup/plugin-commonjs'

const root = process.platform === 'win32' ? path.resolve('/') : '/'
const external = (id) => {
  //if (id.startsWith('react-reconciler')) return false
  return !id.startsWith('.') && !id.startsWith(root)
}
const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json']

const getBabelOptions = ({ useESModules }, targets) => ({
  babelrc: false,
  extensions,
  exclude: '**/node_modules/**',
  runtimeHelpers: true,
  presets: [
    ['@babel/preset-env', { bugfixes: true, loose: true, modules: false, targets }],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
  plugins: [
    ['transform-react-remove-prop-types', { removeImport: true }],
    ['@babel/transform-runtime', { regenerator: false, useESModules }],
  ],
})

function targetTypings(entry, out) {
  return {
    writeBundle() {
      return fs.lstat(`dist/${out}`).catch(() => {
        return fs.writeFile(`dist/${out}.d.ts`, `export * from "./${entry}"`)
      })
    },
  }
}

// https://github.com/google/closure-compiler/issues/3650
// Prepends a three import statement at the top of all exports
// This is because the closure compiler removes it for no reason
function addImport(out, text) {
  return {
    writeBundle() {
      return fs.lstat(out).then(async () => {
        const data = await fs.readFile(out)
        const fd = await fs.open(out, 'w+')
        const insert = new Buffer.from(text)
        await fd.write(insert, 0, insert.length, 0)
        await fd.write(data, 0, data.length, insert.length)
        await fd.close()
      })
    },
  }
}

function createConfig(entry, out, closure = true) {
  return [
    {
      input: `./src/${entry}`,
      output: { file: `dist/${out}.js`, format: 'esm' },
      external,
      plugins: [
        json(),
        commonjs(),
        babel(getBabelOptions({ useESModules: true }, '>1%, not dead, not ie 11, not op_mini all')),
        resolve({ extensions }),
        targetTypings(entry, out),
        /*closure &&
          compiler({
            compilation_level: 'SIMPLE',
            jscomp_off: 'checkVars',
          }),
        closure && addImport(`dist/${out}.js`, `import * as THREE from "three";`),*/
        sizeSnapshot(),
      ],
    },
    {
      input: `./src/${entry}`,
      output: { file: `dist/${out}.cjs.js`, format: 'cjs' },
      external,
      plugins: [
        json(),
        commonjs(),
        babel(getBabelOptions({ useESModules: false })),
        sizeSnapshot(),
        resolve({ extensions }),
        targetTypings(entry, out),
      ],
    },
  ]
}

export default [
  ...createConfig('targets/web', 'web'),
  ...createConfig('targets/svg', 'svg'),
  ...createConfig('targets/css2d', 'css2d'),
  ...createConfig('targets/css3d', 'css3d'),
  ...createConfig('targets/native/index', 'native', false),
  ...createConfig('components', 'components', false),
]
