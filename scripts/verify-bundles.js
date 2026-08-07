/**
 * Verify that each entry point's bundle has the correct THREE imports
 * Run after `pnpm build` to validate bundle optimization
 *
 * Usage: node scripts/verify-bundles.js
 *
 * Each entry point should be a standalone bundle with different THREE imports:
 * - Default: both 'three' and 'three/webgpu'
 * - Legacy: only 'three' (no webgpu)
 * - WebGPU: only 'three/webgpu' (no plain three)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FIBER_DIST = path.join(__dirname, '../packages/fiber/dist')

//* Configuration ==============================

const checks = [
  {
    name: 'Default entry (@react-three/fiber)',
    file: 'index.mjs',
    // Default should have both three and three/webgpu
    shouldContain: ["from 'three'", "from 'three/webgpu'"],
    shouldNotContain: [],
    notes: 'Default entry supports both WebGL and WebGPU',
  },
  {
    name: 'Legacy entry (@react-three/fiber/legacy)',
    file: 'legacy.mjs',
    // Legacy should only have three, NOT three/webgpu
    shouldContain: ["from 'three'"],
    shouldNotContain: ["from 'three/webgpu'", "from 'three/tsl'"],
    notes: 'Legacy entry should only have WebGL (no WebGPU imports)',
  },
  {
    name: 'WebGPU entry (@react-three/fiber/webgpu)',
    file: 'webgpu/index.mjs',
    // WebGPU should have three/webgpu but NOT plain three
    shouldContain: ["from 'three/webgpu'"],
    // This used to be empty while the note below claimed otherwise -- the invariant was documented
    // and never enforced. Subpath imports (three/tsl, three/addons/*) are fine and are not matched
    // by this, because the pattern includes the closing quote.
    shouldNotContain: ["from 'three'"],
    notes: 'WebGPU entry should only have WebGPU (no plain three imports)',
  },
]

/**
 * Emitted JS that must not import the package by name, and the minimum size that counts as a real
 * build. Both guard failure modes the per-entry checks structurally cannot see.
 */
const EMITTED_JS = ['index.mjs', 'index.cjs', 'legacy.mjs', 'legacy.cjs', 'webgpu/index.mjs', 'webgpu/index.cjs']

// A stub is ~5 KB of jiti; a real entry is ~660 KB. Anything in between is not a thing we ship.
const MIN_REAL_BUILD_BYTES = 100 * 1024

//* Helpers ==============================

function findThreeImports(content) {
  // Match imports from three, three/webgpu, three/tsl, three/addons/*
  const imports = content.match(/from ['"]three[^'"]*['"]/g) || []
  return [...new Set(imports)]
}

function checkForSharedChunks(content) {
  // Check if bundle references external chunks (indicates shared chunking)
  return content.match(/from ['"][^'"]*chunk[^'"]*['"]/gi) || []
}

//* Analysis ==============================

console.log('\n🔍 Bundle Analysis Report\n')
console.log('='.repeat(60))

let allPassed = true
const results = []

// First check if dist exists
if (!fs.existsSync(FIBER_DIST)) {
  console.log('❌ dist folder not found. Run `pnpm build` first.\n')
  process.exit(1)
}

for (const check of checks) {
  const filePath = path.join(FIBER_DIST, check.file)

  console.log(`\n📦 ${check.name}`)
  console.log('-'.repeat(60))

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: dist/${check.file}`)
    console.log('   Run `pnpm build` first.')
    allPassed = false
    results.push({
      name: check.name,
      size: 0,
      passed: false,
      threeImports: [],
      isStandalone: false,
    })
    continue
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const stats = fs.statSync(filePath)
  const sizeKB = (stats.size / 1024).toFixed(2)

  console.log(`   📄 File: dist/${check.file}`)
  console.log(`   📊 Size: ${sizeKB} KB`)

  // Check for required patterns
  let checksPassed = true

  console.log('\n   Required imports:')
  for (const pattern of check.shouldContain) {
    if (content.includes(pattern)) {
      console.log(`   ✅ Contains: ${pattern}`)
    } else {
      console.log(`   ❌ MISSING: ${pattern}`)
      checksPassed = false
      allPassed = false
    }
  }

  // Check for forbidden patterns
  if (check.shouldNotContain.length > 0) {
    console.log('\n   Forbidden imports:')
    for (const pattern of check.shouldNotContain) {
      if (!content.includes(pattern)) {
        console.log(`   ✅ Does not contain: ${pattern}`)
      } else {
        console.log(`   ❌ SHOULD NOT contain: ${pattern}`)
        checksPassed = false
        allPassed = false
      }
    }
  }

  // Analyze all THREE imports in the file
  const threeImports = findThreeImports(content)
  console.log('\n   All THREE imports found:')
  if (threeImports.length > 0) {
    threeImports.forEach((imp) => console.log(`      - ${imp}`))
  } else {
    console.log('      (none)')
  }

  // Check for shared chunks (should be none with unbuild)
  const sharedChunks = checkForSharedChunks(content)
  const isStandalone = sharedChunks.length === 0

  if (isStandalone) {
    console.log('\n   ✅ Standalone bundle (no shared chunks)')
  } else {
    console.log(`\n   ⚠️  References shared chunks: ${sharedChunks.join(', ')}`)
  }

  if (check.notes) {
    console.log(`\n   📝 ${check.notes}`)
  }

  results.push({
    name: check.name,
    size: sizeKB,
    passed: checksPassed,
    threeImports,
    isStandalone,
  })
}

//* Cross-cutting checks ==============================
// The per-entry checks above look for `three/webgpu` in each bundle. That is one hop short of the
// invariant we actually care about: an entry that imports `@react-three/fiber` by name pulls the
// *default* entry at runtime, and the default entry imports `three/webgpu`. So the legacy build can
// carry the entire WebGPU renderer while every check above passes.
//
// The specifier survives a build because rollup cannot resolve the package from inside itself,
// leaves it external, and `failOnWarn: false` swallows the warning. `pnpm stub` does not reproduce
// it -- unbuild detects the self-reference and hands jiti an explicit alias -- so stub and build
// disagree and only the build is wrong. Hence checking the emitted files directly.

console.log('\n\n📦 Cross-cutting checks')
console.log('-'.repeat(60))

let crossCuttingPassed = true

console.log('\n   Package self-imports (must be none):')
for (const file of EMITTED_JS) {
  const filePath = path.join(FIBER_DIST, file)
  if (!fs.existsSync(filePath)) continue

  const content = fs.readFileSync(filePath, 'utf-8')
  const selfImport = content.match(/(?:from|require\()\s*['"]@react-three\/fiber['"]/)

  if (selfImport) {
    console.log(`   ❌ dist/${file} imports '@react-three/fiber' -- use a relative import instead`)
    console.log(`      This drags the default entry (and three/webgpu) into every bundle.`)
    crossCuttingPassed = false
  } else {
    console.log(`   ✅ dist/${file}`)
  }
}

console.log('\n   Real build, not a stub:')
for (const file of EMITTED_JS) {
  const filePath = path.join(FIBER_DIST, file)
  if (!fs.existsSync(filePath)) continue

  const { size } = fs.statSync(filePath)
  if (size < MIN_REAL_BUILD_BYTES) {
    console.log(`   ❌ dist/${file} is ${(size / 1024).toFixed(1)} KB -- this is a stub, not a build`)
    console.log(`      Run \`pnpm build\`. \`pnpm dev\`/\`pnpm stub\` overwrite dist with jiti stubs.`)
    crossCuttingPassed = false
  } else {
    console.log(`   ✅ dist/${file} (${(size / 1024).toFixed(1)} KB)`)
  }
}

// Stub .d.ts files embed absolute paths from the machine that generated them.
const dtsWithLocalPaths = ['index.d.ts', 'legacy.d.ts', 'webgpu/index.d.ts'].filter((file) => {
  const filePath = path.join(FIBER_DIST, file)
  return fs.existsSync(filePath) && /["']\/(?:Users|home)\//.test(fs.readFileSync(filePath, 'utf-8'))
})

if (dtsWithLocalPaths.length > 0) {
  console.log(`\n   ❌ Absolute local paths in declarations: ${dtsWithLocalPaths.join(', ')}`)
  crossCuttingPassed = false
} else {
  console.log('\n   ✅ No absolute local paths in declarations')
}

if (!crossCuttingPassed) allPassed = false

//* Summary ==============================

console.log('\n' + '='.repeat(60))
console.log('📊 Summary')
console.log('='.repeat(60))

results.forEach((r) => {
  const status = r.passed ? '✅' : '❌'
  const standalone = r.isStandalone ? '(standalone)' : '(shared chunks!)'
  console.log(`${status} ${r.name}: ${r.size} KB ${standalone}`)
})

console.log('\n' + '='.repeat(60))

// Final verdict
const allStandalone = results.every((r) => r.isStandalone)

if (allPassed && allStandalone) {
  console.log('✅ All checks passed! Bundles are correctly optimized.\n')
  process.exit(0)
} else {
  if (!allPassed) {
    console.log('❌ Some import checks failed. See above for details.')
  }
  if (!allStandalone) {
    console.log('⚠️  Some bundles are not standalone (using shared chunks).')
  }
  console.log('')
  process.exit(1)
}
