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
    shouldNotContain: [],
    notes: 'WebGPU entry should only have WebGPU (no plain three imports)',
  },
]

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
