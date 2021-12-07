const path = require('path')
const fs = require('fs')
const babel = require('@babel/core')
const recursiveReaddir = require('recursive-readdir')
const { execSync } = require('child_process')
const config = require('./babel.config')

// Matches relative imports and requires
const IMPORT_REGEX = /(require\(['"]|from ['"])\.+\/[^'"]+/g

// Checks if file extension is a module
const MODULE_REGEX = /\.(mjs|tsx|ts|jsx|js)$/

/**
 * Returns true if filename ends with mjs, js/jsx, ts/jsx, etc.
 */
const isModule = (filename) => MODULE_REGEX.test(filename)

/**
 * Creates a babel config with module and target preferences.
 */
const createConfig = ({ modules = false, ...rest } = {}) => {
  const presets = config.presets.map((preset) => {
    const [name, settings] = Array.isArray(preset) ? preset : [preset, {}]

    // Override preset-env's modules option
    if (name === '@babel/preset-env') {
      return [
        name,
        {
          ...settings,
          modules,
        },
      ]
    }

    return preset
  })

  return {
    ...config,
    ...rest,
    presets,
  }
}

/**
 * Transforms a file for esm or cjs.
 */
async function transform(filePath, type) {
  // Get file contents
  const src = fs.readFileSync(filePath, { encoding: 'utf-8' })

  // Get options
  const modules = type === 'cjs' ? 'commonjs' : false
  const filename = path.basename(filePath)
  const opts = createConfig({ modules, filename })

  // Transform file
  const { code } = await babel.transformAsync(src, opts)

  // Transform file extensions and add type suffixes to imports/requires
  const source = code.replace(IMPORT_REGEX, (str) => {
    const name = str.replace(MODULE_REGEX, '')
    const hasExt = MODULE_REGEX.test(str)

    return `${name}.${type}${hasExt ? '.js' : ''}`
  })

  // Get file name, transform platform file extensions
  const [name, ...exts] = path.basename(filePath).split('.')
  const [_, platform] = exts.reverse()
  const ext = platform ? `${platform}.js` : 'js'

  // Write output
  const targetDir = path.dirname(filePath).replace('src', 'dist')
  fs.writeFileSync(path.resolve(targetDir, `${name}.${type}.${ext}`), source)
}

/**
 * Transforms a lib with esm and cjs output.
 */
async function transformLib(lib) {
  const entryDir = path.resolve(process.cwd(), 'packages', lib, 'src')
  const paths = await recursiveReaddir(entryDir)

  await Promise.all(
    paths.map(async (filePath) => {
      // Don't transform non-modules
      if (!isModule(filePath)) return
      // Don't transform tests
      if (filePath.includes('.test.')) return

      // Transform source
      await transform(filePath, 'esm')
      await transform(filePath, 'cjs')
    }),
  )
}

// Build libs
;(async () => {
  // Get list of packages
  const packagesDir = path.resolve(process.cwd(), 'packages')

  // Filter to libs
  const libs = fs.readdirSync(packagesDir).filter((lib) => {
    const packagePath = path.resolve(packagesDir, lib, 'package.json')
    const hasPackage = fs.existsSync(packagePath)

    return hasPackage
  })

  // Build & transform libs
  await Promise.all(
    libs.map(async (lib) => {
      execSync(`npm --prefix packages/${lib} run build`)

      const dir = path.resolve(process.cwd(), 'packages', lib)
      await transformLib(dir)
    }),
  )
})()
