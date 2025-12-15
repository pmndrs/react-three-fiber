# Testing Guide

This guide explains how to test the R3F bundle outputs and verify correct THREE.js import resolution.

## Overview

R3F has three entry points, each with different THREE.js imports:

| Entry Point | Package Import              | THREE Imports            |
| ----------- | --------------------------- | ------------------------ |
| Default     | `@react-three/fiber`        | `three` + `three/webgpu` |
| Legacy      | `@react-three/fiber/legacy` | `three` only             |
| WebGPU      | `@react-three/fiber/webgpu` | `three/webgpu` only      |

## Testing Commands

### 1. Jest Tests (Source-level)

```bash
# Run all tests
yarn test

# Run bundle entry point tests specifically
yarn test packages/fiber/tests/bundles.test.ts

# Watch mode
yarn test:watch
```

**What Jest tests verify:**

- Entry points export correctly
- Core functions are available (`createRoot`, `useThree`, `useFrame`, etc.)
- Build flags are exported (`R3F_BUILD_LEGACY`, `R3F_BUILD_WEBGPU`)
- WebGPU-specific hooks are available from the webgpu entry

> **Note:** Jest tests run against **source files** via babel, not built bundles. The babel config resolves `#three` to the default `three/index.ts` for all entry points, so build flags will be `true` for both in Jest.

### 2. Bundle Verification (Build-level)

```bash
# Build first, then verify
yarn build && yarn verify-bundles
```

**What verify-bundles checks:**

- Each bundle file exists
- **Default bundle** contains both `from 'three'` and `from 'three/webgpu'`
- **Legacy bundle** contains `from 'three'` but NOT `from 'three/webgpu'` or `from 'three/tsl'`
- **WebGPU bundle** contains `from 'three/webgpu'` and `from 'three/tsl'`
- No shared chunks (each bundle is standalone)

### 3. Full Verification Flow

```bash
# Complete verification
yarn build && yarn verify-bundles && yarn test packages/fiber/tests/bundles.test.ts
```

## Test Files

### `packages/fiber/tests/bundles.test.ts`

Tests entry point exports and functionality:

```typescript
// Default entry
import('@react-three/fiber')
// Expects: R3F_BUILD_LEGACY=true, R3F_BUILD_WEBGPU=true

// Legacy entry
import('@react-three/fiber/legacy')
// Expects: R3F_BUILD_LEGACY=true, R3F_BUILD_WEBGPU=false (in built bundle)

// WebGPU entry
import('@react-three/fiber/webgpu')
// Expects: R3F_BUILD_LEGACY=false, R3F_BUILD_WEBGPU=true (in built bundle)
```

### `scripts/verify-bundles.js`

Analyzes built output files:

```bash
node scripts/verify-bundles.js
```

Output example:

```
📦 Default entry (@react-three/fiber)
   📄 File: dist/index.mjs
   📊 Size: 74.44 KB
   ✅ Contains: from 'three'
   ✅ Contains: from 'three/webgpu'
   ✅ Standalone bundle (no shared chunks)

📦 Legacy entry (@react-three/fiber/legacy)
   📄 File: dist/legacy.mjs
   📊 Size: 74.03 KB
   ✅ Contains: from 'three'
   ✅ Does not contain: from 'three/webgpu'
   ✅ Standalone bundle (no shared chunks)
```

## Adding New Tests

### Testing a new export

```typescript
// In bundles.test.ts
it('should export myNewFunction', async () => {
  const fiber = await import('@react-three/fiber')
  expect(typeof fiber.myNewFunction).toBe('function')
})
```

### Testing WebGPU-specific features

```typescript
it('should export WebGPU-specific hook', () => {
  const webgpu = await import('@react-three/fiber/webgpu')
  expect(typeof webgpu.useMyWebGPUHook).toBe('function')
})
```

## Troubleshooting

### "Multiple instances of Three.js" warning

This warning appears in Jest tests because both `three` and `three/webgpu` are loaded. It's expected in tests and doesn't affect functionality.

### Bundle verification fails

1. Make sure you ran `yarn build` first
2. Check that the `dist/` folder exists
3. Verify the build completed without errors

### Tests can't find module

Run `yarn stub` to regenerate development stubs:

```bash
yarn stub
```
