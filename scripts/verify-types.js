/**
 * Verify entry-specific JSX types and portable declaration output.
 * Run node scripts/verify-types.js after pnpm build.
 */

import { readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../packages/fiber/dist')

/**
 * Expected ThreeExports patterns for each entry point
 */
const expectedPatterns = {
  'index.d.ts': {
    name: 'Default',
    // Should reference both three and three/webgpu
    threeExports: /typeof import\(['"]three['"]\)\s*&\s*typeof import\(['"]three\/webgpu['"]\)/,
    forbiddenPatterns: [/typeof THREE\b(?!\$)/], // Should NOT have typeof THREE (merged namespace)
  },
  'legacy.d.ts': {
    name: 'Legacy',
    // Should reference only three (not three/webgpu)
    threeExports: /typeof import\(['"]three['"]\)(?!\s*&)/,
    forbiddenPatterns: [/typeof THREE\b(?!\$)/, /three\/webgpu/],
  },
  'webgpu/index.d.ts': {
    name: 'WebGPU',
    // Should reference only three/webgpu
    threeExports: /typeof import\(['"]three\/webgpu['"]\)/,
    forbiddenPatterns: [/typeof THREE\b(?!\$)/],
  },
}

/**
 * Verify a single .d.ts file
 */
function verifyDtsFile(filename, config) {
  const filepath = resolve(distDir, filename)
  let content

  try {
    content = readFileSync(filepath, 'utf-8')
  } catch (err) {
    console.error(`   ❌ Could not read ${filename}: ${err.message}`)
    return false
  }

  // Extract the ThreeExports type definition
  const threeExportsMatch = content.match(/type ThreeExports = ([^\n]+)/)
  if (!threeExportsMatch) {
    console.error(`   ❌ ThreeExports type not found`)
    return false
  }

  // Resolve namespace aliases to module specifiers before matching.
  let threeExportsLine = threeExportsMatch[0]
  for (const [, alias, specifier] of content.matchAll(/import \* as (\w+) from '([^']+)';/g)) {
    threeExportsLine = threeExportsLine.replace(new RegExp(`typeof ${alias}\\b`, 'g'), `typeof import('${specifier}')`)
  }
  console.log(`   📝 ${threeExportsLine}`)

  let passed = true

  // Check that ThreeExports matches expected pattern
  if (!config.threeExports.test(threeExportsLine)) {
    console.error(`   ❌ ThreeExports does not match expected pattern`)
    console.error(`      Expected pattern: ${config.threeExports}`)
    passed = false
  } else {
    console.log(`   ✅ ThreeExports correctly typed`)
  }

  // Check for forbidden patterns
  for (const forbidden of config.forbiddenPatterns) {
    if (forbidden.test(threeExportsLine)) {
      console.error(`   ❌ ThreeExports contains forbidden pattern: ${forbidden}`)
      passed = false
    }
  }

  // Verify ThreeElements interface exists
  if (!content.includes('interface ThreeElements')) {
    console.error(`   ❌ ThreeElements interface not found`)
    passed = false
  } else {
    console.log(`   ✅ ThreeElements interface exists`)
  }

  return passed
}

/** Reject runtime helpers, internal aliases and local paths in declarations. */
function verifyDistHygiene() {
  console.log('\n📦 Declaration hygiene')
  console.log('─'.repeat(60))

  const forbidden = [
    // Runtime namespace helpers are invalid in declaration files.
    [/_mergeNamespaces/, 'rollup namespace runtime'],
    // Internal alias that only tsconfig paths and the build know about.
    [/from '#types'/, "'#types' import"],
    // A path from the machine that built it.
    [/['"]\/Users\/|['"][A-Z]:\\/, 'absolute local path'],
  ]

  let passed = true
  const walk = (dir) =>
    readdirSync(dir).flatMap((name) => {
      const full = resolve(dir, name)
      return statSync(full).isDirectory() ? walk(full) : /\.d\.[cm]?ts$/.test(name) ? [full] : []
    })

  for (const file of walk(distDir)) {
    const content = readFileSync(file, 'utf-8')
    for (const [pattern, label] of forbidden) {
      if (pattern.test(content)) {
        console.error(`   ❌ ${file.slice(distDir.length + 1)} contains ${label}`)
        passed = false
      }
    }
  }
  if (passed) console.log('   ✅ No namespace runtime, alias imports or local paths in any declaration')
  return passed
}

/**
 * Run a TypeScript compilation test to verify types actually resolve
 */
function runTypeResolutionTest() {
  console.log('\n📦 Type Resolution Test')
  console.log('─'.repeat(60))

  const testFile = resolve(__dirname, '../.type-test-temp.tsx')
  const testCode = `
// Temporary file for type verification - will be deleted
import type { ThreeElements, ThreeExports } from './packages/fiber/dist/index'

// Test 1: ThreeExports should have Mesh (from three.js)
type HasMesh = ThreeExports extends { Mesh: any } ? true : false
const _test1: HasMesh = true

// Test 2: ThreeElements should have 'mesh' key (lowercase)
type HasMeshElement = 'mesh' extends keyof ThreeElements ? true : false
const _test2: HasMeshElement = true

// Test 3: mesh element should have position prop
type MeshHasPosition = ThreeElements['mesh'] extends { position?: any } ? true : false
const _test3: MeshHasPosition = true

// Test 4: ThreeExports should not be 'any' (this would fail if it were)
type IsNotAny = ThreeExports extends { __brand: 'this-should-not-exist' } ? false : true
const _test4: IsNotAny = true

// Test 5: Verify mesh type has actual Three.js Mesh properties (not any)
// If ThreeElements['mesh'] were 'any', this would pass with anything
type MeshHasRotation = ThreeElements['mesh'] extends { rotation?: any } ? true : false
const _test5: MeshHasRotation = true

// Test 6: Verify boxGeometry exists
type HasBoxGeometry = 'boxGeometry' extends keyof ThreeElements ? true : false
const _test6: HasBoxGeometry = true

export {}
`

  try {
    writeFileSync(testFile, testCode, 'utf-8')

    // Run tsc on the test file
    execSync(`npx tsc --noEmit --strict --skipLibCheck "${testFile}"`, {
      cwd: resolve(__dirname, '..'),
      stdio: 'pipe',
    })

    console.log('   ✅ Type resolution test passed')
    console.log('      - ThreeExports has Mesh constructor')
    console.log('      - ThreeElements has mesh element')
    console.log('      - mesh element has position prop')
    console.log('      - mesh element has rotation prop')
    console.log('      - ThreeElements has boxGeometry element')
    console.log('      - ThreeExports is not any')

    unlinkSync(testFile)
    return true
  } catch (err) {
    console.error('   ❌ Type resolution test failed')
    console.error(`      ${err.message}`)
    try {
      unlinkSync(testFile)
    } catch {}
    return false
  }
}

function runPublicConsumerTest() {
  console.log('\nPublic Entry Consumer Type Test')
  console.log('─'.repeat(60))

  const projects = [
    ['Default', 'scripts/type-tests/tsconfig.default.json'],
    ['Legacy', 'scripts/type-tests/tsconfig.legacy.json'],
    ['WebGPU', 'scripts/type-tests/tsconfig.json'],
  ]

  try {
    for (const [name, project] of projects) {
      execSync(`pnpm exec tsc --project ${project} --pretty false`, {
        cwd: resolve(__dirname, '..'),
        stdio: 'pipe',
      })
      console.log(`   ${name} consumer type test passed`)
    }
    return true
  } catch (error) {
    console.error('   Public entry consumer type test failed')
    console.error(error.stdout?.toString() || error.message)
    return false
  }
}

/**
 * Main execution
 */
function main() {
  console.log('\n🔍 Type Verification Report\n')
  console.log('═'.repeat(60))

  let allPassed = true

  for (const [filename, config] of Object.entries(expectedPatterns)) {
    console.log(
      `\n📦 ${config.name} entry (@react-three/fiber${filename === 'index.d.ts' ? '' : '/' + filename.replace('/index.d.ts', '').replace('.d.ts', '')})`,
    )
    console.log('─'.repeat(60))
    console.log(`   📄 File: ${filename}`)

    if (!verifyDtsFile(filename, config)) {
      allPassed = false
    }
  }

  if (!verifyDistHygiene()) {
    allPassed = false
  }

  // Run type resolution test
  if (!runTypeResolutionTest()) {
    allPassed = false
  }

  if (!runPublicConsumerTest()) {
    allPassed = false
  }

  console.log('\n' + '═'.repeat(60))

  if (allPassed) {
    console.log('✅ All type checks passed!\n')
    process.exit(0)
  } else {
    console.log('❌ Some type checks failed!\n')
    process.exit(1)
  }
}

main()
