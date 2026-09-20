/**
 * Bundle mixed-entry consumers and verify one shared core with only the expected renderers.
 * Check statically loaded chunks in unminified output.
 * Run node scripts/verify-treeshake.js after pnpm build.
 */
import { build } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const FIBER_DIST = path.join(ROOT, 'packages/fiber/dist')
const WORK_DIR = path.join(ROOT, 'node_modules/.cache/r3f-verify-treeshake')

//* Configuration ==============================

const ENTRY_FILES = {
  root: path.join(FIBER_DIST, 'index.mjs'),
  legacy: path.join(FIBER_DIST, 'legacy.mjs'),
  webgpu: path.join(FIBER_DIST, 'webgpu/index.mjs'),
}

const ENTRY_SPECIFIERS = {
  root: '@react-three/fiber',
  legacy: '@react-three/fiber/legacy',
  webgpu: '@react-three/fiber/webgpu',
}

//* Helpers ==============================

function kb(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`
}

/** Writes the consumer for a case and returns its entry file. */
function writeConsumer(caseDir, { app, lib }) {
  fs.mkdirSync(caseDir, { recursive: true })
  const libFile = path.join(caseDir, 'lib.js')
  const appFile = path.join(caseDir, 'app.js')
  // Model a library that imports shared APIs.
  fs.writeFileSync(
    libFile,
    `import { extend, useThree, useStore, useFrame, createPortal, useLoader, useRenderTarget } from '${ENTRY_SPECIFIERS[lib]}'\n` +
      `export const lib = { extend, useThree, useStore, useFrame, createPortal, useLoader, useRenderTarget }\n`,
  )
  // Keep the app Canvas and library APIs reachable during tree-shaking.
  fs.writeFileSync(
    appFile,
    `import { Canvas } from '${ENTRY_SPECIFIERS[app]}'\n` +
      `import { lib } from './lib.js'\n` +
      `globalThis.__r3f_treeshake_fixture = { Canvas, lib }\n`,
  )
  return appFile
}

async function bundle(appFile) {
  const result = await build({
    configFile: false,
    root: ROOT,
    logLevel: 'silent',
    resolve: {
      alias: [
        { find: /^@react-three\/fiber\/webgpu$/, replacement: ENTRY_FILES.webgpu },
        { find: /^@react-three\/fiber\/legacy$/, replacement: ENTRY_FILES.legacy },
        { find: /^@react-three\/fiber$/, replacement: ENTRY_FILES.root },
      ],
    },
    build: {
      write: false,
      minify: false,
      target: 'es2022',
      modulePreload: false,
      rollupOptions: { input: appFile },
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  const chunks = outputs.flatMap((output) => output.output.filter((item) => item.type === 'chunk'))

  // Follow static imports from the entry chunks. Exclude dynamically loaded chunks.
  const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
  const eager = new Set()
  const visit = (name) => {
    if (eager.has(name)) return
    eager.add(name)
    byName.get(name)?.imports.forEach(visit)
  }
  for (const chunk of chunks) if (chunk.isEntry) visit(chunk.fileName)

  return {
    code: [...eager].map((name) => byName.get(name).code).join('\n'),
    lazy: chunks.filter((chunk) => !eager.has(chunk.fileName)).map((chunk) => chunk.fileName),
  }
}

//* Run ==============================

console.log('\n🌳 Tree-shaking Report\n')
console.log('='.repeat(60))

for (const file of Object.values(ENTRY_FILES)) {
  if (!fs.existsSync(file)) {
    console.log(`❌ ${path.relative(ROOT, file)} not found. Run \`pnpm build\` first.\n`)
    process.exit(1)
  }
}

fs.rmSync(WORK_DIR, { recursive: true, force: true })

let allPassed = true
const sizes = {}

// App selects Canvas, lib selects shared APIs and renderer flags describe expected output.
for (const [index, testCase] of [
  { name: 'WebGPU app + library on root', app: 'webgpu', lib: 'root', webgl: false, webgpu: true },
  { name: 'Legacy app + library on root', app: 'legacy', lib: 'root', webgl: true, webgpu: false },
  { name: 'WebGPU app + library on /webgpu (control)', app: 'webgpu', lib: 'webgpu', webgl: false, webgpu: true },
  { name: 'Legacy app + library on /legacy (control)', app: 'legacy', lib: 'legacy', webgl: true, webgpu: false },
  { name: 'Root app (carries both by design)', app: 'root', lib: 'root', webgl: true, webgpu: true },
].entries()) {
  console.log(`\n📦 ${testCase.name}`)
  console.log('-'.repeat(60))

  const caseDir = path.join(WORK_DIR, `case-${index}`)
  const { code, lazy } = await bundle(writeConsumer(caseDir, testCase))
  // R3F_TREESHAKE_DUMP=1 keeps each case's eager output next to its consumer, for inspection.
  if (process.env.R3F_TREESHAKE_DUMP) fs.writeFileSync(path.join(caseDir, 'eager.js'), code)
  sizes[testCase.name] = code.length

  // Renderer instance flags identify implementations in unminified output.
  const hasWebGL = /this\.isWebGLRenderer = true/.test(code)
  const hasWebGPU = /this\.isWebGPURenderer = true/.test(code)
  // Each copy of core registers this context key once.
  const coreCopies = (code.match(/@react-three\/fiber\.context/g) || []).length

  const results = [
    [hasWebGL === testCase.webgl, `WebGLRenderer ${testCase.webgl ? 'present' : 'absent'}`],
    [hasWebGPU === testCase.webgpu, `WebGPURenderer ${testCase.webgpu ? 'present' : 'absent'}`],
    [coreCopies === 1, `core bundled once (found ${coreCopies})`],
  ]
  for (const [ok, message] of results) {
    console.log(`   ${ok ? '✅' : '❌'} ${message}`)
    if (!ok) allPassed = false
  }
  console.log(`   📊 eager output: ${kb(code.length)} (unminified), ${lazy.length} lazy chunk(s) not counted`)
}

//* Mixed vs matched ==============================
// Compare mixed imports against the matching-entry baseline.

console.log('\n📦 Cost of mixing entries')
console.log('-'.repeat(60))

const mixed = sizes['WebGPU app + library on root']
const matched = sizes['WebGPU app + library on /webgpu (control)']
const delta = mixed - matched
console.log(`   library on root:    ${kb(mixed)}`)
console.log(`   library on /webgpu: ${kb(matched)}`)
console.log(`   difference:         ${kb(delta)}`)
// Allow small entry overhead without an extra renderer or core copy.
const deltaOk = Math.abs(delta) < 16 * 1024
console.log(`   ${deltaOk ? '✅' : '❌'} difference is glue only (< 16 KB)`)
if (!deltaOk) allPassed = false

//* Summary ==============================

console.log('\n' + '='.repeat(60))
if (allPassed) {
  console.log('✅ All tree-shaking checks passed\n')
} else {
  console.log('❌ Some tree-shaking checks failed\n')
  process.exit(1)
}
