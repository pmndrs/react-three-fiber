/* eslint-disable no-undef */
/* eslint-env node */
/**
 * Post-build types fixer for @react-three/fiber
 *
 * Problem: The #three alias gets resolved at build time into a runtime _mergeNamespaces call.
 * TypeScript's `typeof` on this merged var loses the full type information from the source modules.
 *
 * Solution: After unbuild generates .d.ts files, we replace the broken ThreeExports type
 * with a proper type alias that references the actual three modules. Rollup's emitted runtime
 * namespace helper must also be removed because implementations and initialized variables are
 * invalid in declaration files.
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
  'index.d.ts': {
    threeExports: `typeof import('three') & typeof import('three/webgpu')`,
    namespaceModule: 'three_webgpu',
  },
  // Legacy entry: WebGL only
  'legacy.d.ts': {
    threeExports: `typeof import('three')`,
    namespaceModule: 'THREE$1',
  },
  // WebGPU entry: WebGPU only
  'webgpu/index.d.ts': {
    threeExports: `typeof import('three/webgpu')`,
    namespaceModule: 'three_webgpu',
  },
}

/**
 * Escape text for an exact regular-expression fragment.
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Count all non-overlapping matches without mutating a shared RegExp.
 */
function countMatches(content, pattern) {
  return [...content.matchAll(pattern)].length
}

/**
 * Remove the one Rollup runtime namespace block that unbuild emits into a public declaration.
 * ThreeExports no longer references this variable after its type fix.
 */
function removeNamespaceRuntime(filename, content, namespaceModule) {
  const helperMarker = 'function _mergeNamespaces('
  const namespaceMarker = 'var THREE = /*#__PURE__*/_mergeNamespaces('
  const helperMarkerCount = content.split(helperMarker).length - 1
  const namespaceMarkerCount = content.split(namespaceMarker).length - 1

  if (helperMarkerCount === 0 && namespaceMarkerCount === 0) return content

  if (helperMarkerCount !== 1 || namespaceMarkerCount !== 1) {
    console.error(
      `❌ ${filename}: Expected one Rollup helper and namespace, found ${helperMarkerCount} and ${namespaceMarkerCount}`,
    )
    return null
  }

  const mergeHelperPattern = /\nfunction _mergeNamespaces\([\s\S]*?\n}\n/g
  const mergedNamespacePattern = new RegExp(
    `\\nvar THREE = /\\*#__PURE__\\*/_mergeNamespaces\\(\\{[\\s\\S]*?\\n\\}, \\[${escapeRegExp(namespaceModule)}\\]\\);\\n`,
    'g',
  )
  const helperBlockCount = countMatches(content, mergeHelperPattern)
  const namespaceBlockCount = countMatches(content, mergedNamespacePattern)

  if (helperBlockCount !== 1 || namespaceBlockCount !== 1) {
    console.error(
      `❌ ${filename}: Unexpected Rollup runtime shape; matched ${helperBlockCount} helper and ${namespaceBlockCount} namespace blocks`,
    )
    return null
  }

  const stripped = content.replace(mergeHelperPattern, '\n').replace(mergedNamespacePattern, '\n')

  if (stripped.includes(helperMarker) || stripped.includes(namespaceMarker)) {
    console.error(`❌ ${filename}: Rollup runtime markers remain after stripping`)
    return null
  }

  return stripped
}

/**
 * Fix the ThreeExports type in a .d.ts file
 */
function fixDtsFile(filename, { threeExports, namespaceModule }) {
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

  modified = removeNamespaceRuntime(filename, modified, namespaceModule)
  if (modified === null) return false

  // Replace the broken type alias with the correct one
  if (pattern.test(modified)) {
    modified = modified.replace(pattern, `type ThreeExports = ${threeExports}`)
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

  for (const [filename, config] of Object.entries(typeFixups)) {
    if (!fixDtsFile(filename, config)) {
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
