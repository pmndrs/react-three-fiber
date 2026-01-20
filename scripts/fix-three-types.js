/* eslint-disable no-undef */
/* eslint-env node */
/**
 * Post-build types fixer for @react-three/fiber
 *
 * Problems solved:
 * 1. The #three alias gets resolved at build time into a runtime _mergeNamespaces call.
 *    TypeScript's `typeof` on this merged var loses the full type information.
 * 2. Module augmentations inside module files don't always work for external consumers.
 *
 * Solutions:
 * 1. Replace broken ThreeExports type with proper import types
 * 2. Extract module augmentations to separate global .d.ts files with reference directives
 *
 * Usage: node scripts/fix-three-types.js (run after pnpm build)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
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
    globalFile: 'index-global.d.ts',
  },
  // Legacy entry: WebGL only
  'legacy.d.ts': {
    threeExports: `typeof import('three')`,
    globalFile: 'legacy-global.d.ts',
  },
  // WebGPU entry: WebGPU only
  'webgpu/index.d.ts': {
    threeExports: `typeof import('three/webgpu')`,
    globalFile: 'index-global.d.ts',
  },
}

/**
 * Generate a global augmentation file content
 */
function generateGlobalFile(mainFile, isWebgpu) {
  const importPath = isWebgpu ? './index' : `./${mainFile.replace('.d.ts', '')}`
  return `// Auto-generated global augmentations for @react-three/fiber
// This file ensures module augmentations work for external consumers

import type { ThreeElements } from '${importPath}'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare module 'react/jsx-dev-runtime' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
`
}

/**
 * Fix the ThreeExports type and create global augmentation file
 */
function fixDtsFile(filename, config) {
  const filepath = resolve(distDir, filename)
  const dir = dirname(filepath)
  const isWebgpu = filename.includes('webgpu')
  let content

  try {
    content = readFileSync(filepath, 'utf-8')
  } catch (err) {
    console.error(`❌ Could not read ${filename}: ${err.message}`)
    return false
  }

  // Pattern: Replace "type ThreeExports = typeof THREE" (inline merged namespace)
  const pattern = /type ThreeExports = typeof THREE\b(?!\$)/g

  let modified = content

  // 1. Replace the broken type alias with the correct one
  if (pattern.test(modified)) {
    modified = modified.replace(pattern, `type ThreeExports = ${config.threeExports}`)
  }

  // 2. Add reference directive to global file at the top (if not already present)
  const refDirective = `/// <reference path="./${config.globalFile}" />\n`
  if (!modified.startsWith('/// <reference')) {
    modified = refDirective + modified
  }

  // 3. Remove the inline module augmentations (they'll be in the global file)
  // Keep them commented out so we know they exist
  modified = modified.replace(
    /declare module ['"]react['"] \{[\s\S]*?^\}/gm,
    '// Module augmentation moved to global file',
  )
  modified = modified.replace(
    /declare module ['"]react\/jsx-runtime['"] \{[\s\S]*?^\}/gm,
    '// Module augmentation moved to global file',
  )
  modified = modified.replace(
    /declare module ['"]react\/jsx-dev-runtime['"] \{[\s\S]*?^\}/gm,
    '// Module augmentation moved to global file',
  )

  // Check if we made any changes
  if (modified === content) {
    console.log(`⚠️  ${filename}: No ThreeExports pattern found to fix`)
    return true
  }

  // Write the fixed main file
  try {
    writeFileSync(filepath, modified, 'utf-8')
    console.log(`✅ ${filename}: Fixed ThreeExports type`)
  } catch (err) {
    console.error(`❌ Could not write ${filename}: ${err.message}`)
    return false
  }

  // 4. Write the global augmentation file
  const globalPath = resolve(dir, config.globalFile)
  const globalContent = generateGlobalFile(filename.split('/').pop(), isWebgpu)

  try {
    writeFileSync(globalPath, globalContent, 'utf-8')
    console.log(`✅ ${config.globalFile}: Created global augmentation file`)
  } catch (err) {
    console.error(`❌ Could not write ${config.globalFile}: ${err.message}`)
    return false
  }

  return true
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
