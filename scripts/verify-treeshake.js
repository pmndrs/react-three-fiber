/**
 * Verify what a consumer's bundle carries for each way of importing fiber.
 *
 * Runs after `pnpm build`, against the built `dist`. Each case is a small app or library written to
 * a temp dir and bundled twice, with Vite (Rollup, what most consumers use) and with esbuild (the
 * strictest tree-shaker of three's exports, and what Vite uses in dev). The output is checked, not
 * fiber's own files: what matters is what an app downloads, and that depends on transitive imports,
 * chunk assignment and the bundler, none of which a grep over `dist` can see.
 *
 * The invariants:
 * - The shared core carries no renderer. A library that imports hooks from any entry adds no
 *   renderer to an app, and core is bundled once however entries are mixed.
 * - `@react-three/fiber` downloads nothing of three eagerly. Its two renderer supports are lazy
 *   chunks, and each chunk's closure carries exactly its own renderer.
 * - `/webgpu` carries the WebGPU renderer statically and never the WebGL one; `/legacy` the reverse.
 *
 * Usage: node scripts/verify-treeshake.js          (R3F_TREESHAKE_DUMP=1 keeps the outputs)
 */
import { build as viteBuild } from 'vite'
import * as esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const FIBER_DIST = path.join(ROOT, 'packages/fiber/dist')
const WORK_DIR = path.join(ROOT, 'node_modules/.cache/r3f-verify-treeshake')

//* Configuration ==============================

const ENTRIES = {
  root: path.join(FIBER_DIST, 'index.mjs'),
  legacy: path.join(FIBER_DIST, 'legacy.mjs'),
  webgpu: path.join(FIBER_DIST, 'webgpu/index.mjs'),
  extension: path.join(FIBER_DIST, 'extension.mjs'),
}

// What an app already has. Everything else, three above all, is bundled like an app would.
const EXTERNALS = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'scheduler',
  'zustand',
  'its-fine',
  'suspend-react',
  'react-use-measure',
  'use-sync-external-store',
  'dequal',
  '@pmndrs/scheduler',
]
const isExternal = (id) => EXTERNALS.some((name) => id === name || id.startsWith(`${name}/`))

// Unminified output keeps these; each renderer sets its flag in its constructor.
const MARKERS = {
  webgl: /this\.isWebGLRenderer = true/,
  webgpu: /this\.isWebGPURenderer = true/,
}
// Each copy of core registers the store context under this key once.
const CORE_KEY = /@react-three\/fiber\.context/g

const LIB_IMPORTS = 'extend, useThree, useStore, useFrame, createPortal, useLoader, useTexture, useRenderTarget'

/**
 * A case is an app (which entry its Canvas comes from, or none) plus a library (which entry its
 * hooks come from, or none), and what the eager output must carry.
 */
const CASES = [
  {
    name: 'Root app: <Canvas> loads either renderer on demand',
    app: 'root',
    eager: { webgl: false, webgpu: false },
    lazy: { webgl: { webgl: true, webgpu: false }, webgpu: { webgl: false, webgpu: true } },
  },
  {
    name: 'Root app + library on root',
    app: 'root',
    lib: 'root',
    eager: { webgl: false, webgpu: false },
    lazy: { webgl: { webgl: true, webgpu: false }, webgpu: { webgl: false, webgpu: true } },
  },
  { name: 'WebGPU app (/webgpu)', app: 'webgpu', eager: { webgl: false, webgpu: true } },
  { name: 'WebGPU app + library on root', app: 'webgpu', lib: 'root', eager: { webgl: false, webgpu: true } },
  { name: 'Legacy app (/legacy)', app: 'legacy', eager: { webgl: true, webgpu: false } },
  { name: 'Legacy app + library on root', app: 'legacy', lib: 'root', eager: { webgl: true, webgpu: false } },
  { name: 'Library only, on root (no Canvas)', lib: 'root', eager: { webgl: false, webgpu: false } },
  { name: 'Library only, on /extension', lib: 'extension', eager: { webgl: false, webgpu: false } },
  {
    name: 'Root app + <Environment> (decoders stay lazy)',
    app: 'root',
    environment: true,
    eager: { webgl: false, webgpu: false },
    lazy: { webgl: { webgl: true, webgpu: false }, webgpu: { webgl: false, webgpu: true } },
  },
]

//* Consumers ==============================

function writeConsumer(caseDir, testCase) {
  fs.mkdirSync(caseDir, { recursive: true })
  const lines = []
  const kept = []
  if (testCase.lib) {
    const names = testCase.lib === 'extension' ? 'useThree, useStore, useFrame, registerRootExtension' : LIB_IMPORTS
    lines.push(`import { ${names} } from '${ENTRIES[testCase.lib]}'`)
    kept.push(`{ ${names} }`)
  }
  if (testCase.app) {
    const names = testCase.environment ? 'Canvas, Environment' : 'Canvas'
    lines.push(`import { ${names} } from '${ENTRIES[testCase.app]}'`)
    kept.push(`{ ${names} }`)
  }
  // Keep the imports reachable so tree-shaking measures what a real app keeps
  lines.push(`globalThis.__r3f_treeshake_fixture = [${kept.join(', ')}]`)
  const file = path.join(caseDir, 'app.js')
  fs.writeFileSync(file, lines.join('\n') + '\n')
  return file
}

//* Bundlers ==============================
// Both return the same shape: every emitted chunk with its static and dynamic imports.

async function bundleWithVite(appFile, outDir) {
  const result = await viteBuild({
    configFile: false,
    root: ROOT,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      target: 'es2022',
      modulePreload: false,
      outDir,
      rollupOptions: { input: appFile, external: isExternal },
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  return outputs
    .flatMap((output) => output.output)
    .filter((item) => item.type === 'chunk')
    .map((chunk) => ({
      name: chunk.fileName,
      code: chunk.code,
      isEntry: chunk.isEntry,
      imports: chunk.imports,
      dynamicImports: chunk.dynamicImports,
    }))
}

async function bundleWithEsbuild(appFile, outDir) {
  const result = await esbuild.build({
    entryPoints: [appFile],
    bundle: true,
    splitting: true,
    format: 'esm',
    minify: false,
    write: false,
    metafile: true,
    logLevel: 'silent',
    outdir: outDir,
    external: EXTERNALS.flatMap((name) => [name, `${name}/*`]),
  })
  const byPath = new Map(result.outputFiles.map((file) => [file.path, file.text]))
  return Object.entries(result.metafile.outputs)
    .filter(([file]) => file.endsWith('.js'))
    .map(([file, meta]) => {
      const abs = path.resolve(ROOT, file)
      const name = path.basename(file)
      const resolveName = (p) => path.basename(p)
      return {
        name,
        code: byPath.get(abs) ?? '',
        // esbuild also records every dynamic-import target as an entry point; only ours is eager
        isEntry: !!meta.entryPoint && path.resolve(ROOT, meta.entryPoint) === appFile,
        imports: meta.imports
          .filter((i) => i.kind === 'import-statement' && !i.external)
          .map((i) => resolveName(i.path)),
        dynamicImports: meta.imports
          .filter((i) => i.kind === 'dynamic-import' && !i.external)
          .map((i) => resolveName(i.path)),
      }
    })
}

//* Analysis ==============================

/** The chunks reached from `start` through static imports only. */
function closure(chunks, start) {
  const byName = new Map(chunks.map((chunk) => [chunk.name, chunk]))
  const seen = new Set()
  const visit = (name) => {
    if (seen.has(name) || !byName.has(name)) return
    seen.add(name)
    byName.get(name).imports.forEach(visit)
  }
  start.forEach(visit)
  return [...seen].map((name) => byName.get(name))
}

const codeOf = (chunks) => chunks.map((chunk) => chunk.code).join('\n')
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`

function checkRenderers(code, expected, label, results) {
  for (const renderer of ['webgl', 'webgpu']) {
    const present = MARKERS[renderer].test(code)
    const name = renderer === 'webgl' ? 'WebGLRenderer' : 'WebGPURenderer'
    results.push([present === expected[renderer], `${label}: ${name} ${expected[renderer] ? 'present' : 'absent'}`])
  }
}

function analyze(chunks, testCase) {
  const results = []
  const entries = chunks.filter((chunk) => chunk.isEntry).map((chunk) => chunk.name)
  const eager = closure(chunks, entries)
  const eagerCode = codeOf(eager)
  const sizes = [`eager ${kb(eagerCode.length)}`]

  checkRenderers(eagerCode, testCase.eager, 'eager', results)
  const coreCopies = (eagerCode.match(CORE_KEY) || []).length
  results.push([
    coreCopies <= 1,
    `eager: core bundled ${coreCopies === 0 ? 'not at all' : 'once'} (found ${coreCopies})`,
  ])

  if (testCase.lazy) {
    // The renderer supports are the lazy chunks whose closure carries a renderer. Find each by its
    // marker, then check its closure (minus what is already eager) carries only that renderer.
    const eagerNames = new Set(eager.map((chunk) => chunk.name))
    const lazyTargets = [...new Set(eager.flatMap((chunk) => chunk.dynamicImports))]
    for (const renderer of ['webgl', 'webgpu']) {
      const target = lazyTargets.find((name) => {
        const own = closure(chunks, [name]).filter((chunk) => !eagerNames.has(chunk.name))
        return MARKERS[renderer].test(codeOf(own))
      })
      if (!target) {
        results.push([false, `lazy ${renderer}: no lazy chunk carries the renderer`])
        continue
      }
      const own = closure(chunks, [target]).filter((chunk) => !eagerNames.has(chunk.name))
      const code = codeOf(own)
      checkRenderers(code, testCase.lazy[renderer], `lazy ${renderer} (${target})`, results)
      sizes.push(`lazy ${renderer} ${kb(code.length)}`)
    }
  } else {
    const lazy = chunks.filter((chunk) => !eager.some((e) => e.name === chunk.name))
    if (lazy.length) sizes.push(`${lazy.length} lazy chunk(s) not counted`)
  }

  return { results, sizes: sizes.join(', ') }
}

//* Run ==============================

console.log('\n🌳 Tree-shaking Report\n')
console.log('='.repeat(72))

for (const file of Object.values(ENTRIES)) {
  if (!fs.existsSync(file)) {
    console.log(`❌ ${path.relative(ROOT, file)} not found. Run \`pnpm build\` first.\n`)
    process.exit(1)
  }
}

fs.rmSync(WORK_DIR, { recursive: true, force: true })

let allPassed = true
const bundlers = { vite: bundleWithVite, esbuild: bundleWithEsbuild }

for (const [index, testCase] of CASES.entries()) {
  console.log(`\n📦 ${testCase.name}`)
  console.log('-'.repeat(72))
  const caseDir = path.join(WORK_DIR, `case-${index}`)
  const appFile = writeConsumer(caseDir, testCase)

  for (const [bundlerName, bundle] of Object.entries(bundlers)) {
    const outDir = path.join(caseDir, bundlerName)
    let chunks
    try {
      chunks = await bundle(appFile, outDir)
    } catch (error) {
      console.log(`   ❌ ${bundlerName}: build failed\n      ${String(error).split('\n')[0]}`)
      allPassed = false
      continue
    }
    if (process.env.R3F_TREESHAKE_DUMP) {
      fs.mkdirSync(outDir, { recursive: true })
      for (const chunk of chunks) fs.writeFileSync(path.join(outDir, path.basename(chunk.name)), chunk.code)
    }
    const { results, sizes } = analyze(chunks, testCase)
    const failed = results.filter(([ok]) => !ok)
    console.log(`   ${failed.length ? '❌' : '✅'} ${bundlerName.padEnd(8)} ${sizes}`)
    for (const [ok, message] of results)
      if (!ok || process.env.R3F_TREESHAKE_VERBOSE) console.log(`      ${ok ? '✅' : '❌'} ${message}`)
    if (failed.length) allPassed = false
  }
}

console.log('\n' + '='.repeat(72))
if (allPassed) {
  console.log('✅ All tree-shaking checks passed\n')
} else {
  console.log('❌ Some tree-shaking checks failed (R3F_TREESHAKE_DUMP=1 keeps the outputs under node_modules/.cache)\n')
  process.exit(1)
}
