/**
 * Consumer smoke test: load each published entry the way an app would.
 *
 * Usage: pnpm build && node scripts/smoke-entries.js
 *
 * verify-bundles reads the emitted files; this one actually loads them. Each entry is requested by
 * its bare specifier (`@react-three/fiber`, `/legacy`, `/webgpu`) from a real workspace consumer,
 * so the request goes through package.json#exports to dist exactly as a published install would.
 * Both conditions of the exports map are exercised, ESM `import` and CJS `require`, and every load
 * runs in its own node process so a failure cannot hide behind a warm module cache.
 *
 * Added for https://github.com/pmndrs/react-three-fiber/issues/3921: dist/legacy.mjs shipped named
 * imports from 'three' that plain three does not export, so ESM linking threw before a line of R3F
 * ran. No source-level test could see it -- vitest aliases #three to the default barrel for every
 * entry -- and verify-bundles only matched module specifiers, not the names imported from them.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// test-renderer depends on @react-three/fiber, so its node_modules links the package by name and
// node resolves the bare specifier through the exports map. Any workspace consumer would do.
const CONSUMER_DIR = path.join(__dirname, '../packages/test-renderer')
const FIBER_DIST = path.join(__dirname, '../packages/fiber/dist')

// A stub is ~5 KB of jiti; a real entry is ~660 KB. Same line verify-bundles draws.
const MIN_REAL_BUILD_BYTES = 100 * 1024

// The named exports every entry must provide. Canvas is what the issue reported; the rest are the
// smallest set an app cannot mount without.
const REQUIRED = ['Canvas', 'createRoot', 'extend', 'useFrame', 'useThree']

const ENTRIES = [
  {
    specifier: '@react-three/fiber',
    files: { esm: 'index.mjs', cjs: 'index.cjs' },
    flags: { R3F_BUILD_LEGACY: true, R3F_BUILD_WEBGPU: true },
  },
  {
    specifier: '@react-three/fiber/legacy',
    files: { esm: 'legacy.mjs', cjs: 'legacy.cjs' },
    flags: { R3F_BUILD_LEGACY: true, R3F_BUILD_WEBGPU: false },
  },
  {
    specifier: '@react-three/fiber/webgpu',
    files: { esm: 'webgpu/index.mjs', cjs: 'webgpu/index.cjs' },
    flags: { R3F_BUILD_LEGACY: false, R3F_BUILD_WEBGPU: true },
  },
]

//* Child programs ==============================
// Each prints one JSON line: where the specifier resolved to, and the type of every required export.

const bindings = [...REQUIRED, 'R3F_BUILD_LEGACY', 'R3F_BUILD_WEBGPU'].join(', ')
const report = (resolved) =>
  `console.log(JSON.stringify({ file: ${resolved}, exports: { ${REQUIRED.map((name) => `${name}: typeof ${name}`).join(', ')} }, R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU }))`

const programs = {
  esm: (specifier) =>
    [`import { ${bindings} } from '${specifier}'`, report(`import.meta.resolve('${specifier}')`)].join('\n'),
  cjs: (specifier) =>
    [`const { ${bindings} } = require('${specifier}')`, report(`require.resolve('${specifier}')`)].join('\n'),
}

function load(kind, specifier) {
  const args = kind === 'esm' ? ['--input-type=module'] : []
  const result = spawnSync(process.execPath, [...args, '-e', programs[kind](specifier)], {
    cwd: CONSUMER_DIR,
    encoding: 'utf-8',
  })
  if (result.status !== 0) {
    return { error: (result.stderr || result.stdout || `exit code ${result.status}`).trim() }
  }
  const parsed = JSON.parse(result.stdout.trim().split('\n').pop())
  if (parsed.file.startsWith('file:')) parsed.file = fileURLToPath(parsed.file)
  return parsed
}

//* Checks ==============================

console.log('\n🚬 Entry smoke test (real package resolution)\n')
console.log('='.repeat(60))

if (!fs.existsSync(FIBER_DIST)) {
  console.log('❌ dist folder not found. Run `pnpm build` first.\n')
  process.exit(1)
}

let allPassed = true

for (const entry of ENTRIES) {
  console.log(`\n📦 ${entry.specifier}`)
  console.log('-'.repeat(60))

  for (const kind of ['esm', 'cjs']) {
    const label = `${kind.toUpperCase()} ${kind === 'esm' ? 'import' : 'require'}`
    const expectedFile = path.join(FIBER_DIST, entry.files[kind])
    const result = load(kind, entry.specifier)
    const problems = []

    if (result.error) {
      problems.push(result.error.split('\n').slice(0, 6).join('\n      '))
    } else {
      if (fs.realpathSync(result.file) !== fs.realpathSync(expectedFile)) {
        problems.push(`resolved to ${result.file}, expected dist/${entry.files[kind]}`)
      } else if (fs.statSync(result.file).size < MIN_REAL_BUILD_BYTES) {
        problems.push(`dist/${entry.files[kind]} is a stub, not a build -- run \`pnpm build\``)
      }
      for (const name of REQUIRED) {
        if (result.exports[name] !== 'function')
          problems.push(`${name} is ${result.exports[name]}, expected a function`)
      }
      for (const [flag, expected] of Object.entries(entry.flags)) {
        if (result[flag] !== expected) problems.push(`${flag} is ${result[flag]}, expected ${expected}`)
      }
    }

    if (problems.length === 0) {
      console.log(`   ✅ ${label} -> dist/${entry.files[kind]} (${REQUIRED.join(', ')})`)
    } else {
      allPassed = false
      console.log(`   ❌ ${label}`)
      for (const problem of problems) console.log(`      ${problem}`)
    }
  }
}

console.log('\n' + '='.repeat(60))
if (allPassed) {
  console.log('✅ Every entry loads through package.json#exports with its expected surface.\n')
  process.exit(0)
}
console.log('❌ An entry failed to load as a consumer would load it. See above.\n')
process.exit(1)
