/* eslint-disable no-undef */
/* eslint-env node */
/**
 * Post-build types fixer for @react-three/fiber
 *
 * Problem: The #three alias gets resolved at build time into a runtime _mergeNamespaces call.
 * TypeScript's `typeof` on this merged var loses the full type information from the source modules.
 *
 * Solution: After unbuild generates .d.ts files, we replace the broken ThreeExports type
 * with a proper type alias that references the actual three modules.
 *
 * Usage: node scripts/fix-three-types.js (run after pnpm build)
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../packages/fiber/dist')

/**
 * Type definitions for each entry point
 */
const typeFixups = {
  // Default entry: both WebGL and WebGPU types
  'index.d.ts': `typeof import('three') & typeof import('three/webgpu')`,
  // Legacy entry: WebGL only
  'legacy.d.ts': `typeof import('three')`,
  // WebGPU entry: WebGPU only
  'webgpu/index.d.ts': `typeof import('three/webgpu')`,
}

/**
 * Fix the ThreeExports type in a .d.ts file
 */
function fixDtsFile(filename, threeExportsType) {
  const filepath = resolve(distDir, filename)
  let content

  try {
    content = readFileSync(filepath, 'utf-8')
  } catch (err) {
    console.error(`❌ Could not read ${filename}: ${err.message}`)
    return false
  }

  // Pattern: Replace "type ThreeExports = typeof THREE" (inline merged namespace)
  // Negative lookahead (?!\$) ensures we don't match THREE$1 etc.
  const pattern = /type ThreeExports = typeof THREE\b(?!\$)/g

  let modified = content

  // Replace the broken type alias with the correct one
  if (pattern.test(modified)) {
    modified = modified.replace(pattern, `type ThreeExports = ${threeExportsType}`)
  }

  // Check if we made any changes
  if (modified === content) {
    console.log(`⚠️  ${filename}: No ThreeExports pattern found to fix`)
    return true // Not necessarily an error
  }

  // Write the fixed content
  try {
    writeFileSync(filepath, modified, 'utf-8')
    console.log(`✅ ${filename}: Fixed ThreeExports type`)
    return true
  } catch (err) {
    console.error(`❌ Could not write ${filename}: ${err.message}`)
    return false
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Fixing Three.js types in dist...\n')

  let allSuccess = true

  for (const [filename, threeExportsType] of Object.entries(typeFixups)) {
    if (!fixDtsFile(filename, threeExportsType)) {
      allSuccess = false
    }
  }

  console.log('')

  if (allSuccess) {
    console.log('✨ All type fixes applied successfully!')
  } else {
    console.log('⚠️  Some fixes failed - check output above')
    process.exit(1)
  }
}

main()
