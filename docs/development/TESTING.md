# Testing Guide

This guide covers how to test `@react-three/fiber` entry points and bundle optimization.

## Overview

R3F has three entry points, each with different THREE.js imports:

| Entry Point | Import                      | THREE Imports            |
| ----------- | --------------------------- | ------------------------ |
| Default     | `@react-three/fiber`        | `three` + `three/webgpu` |
| Legacy      | `@react-three/fiber/legacy` | `three` only             |
| WebGPU      | `@react-three/fiber/webgpu` | `three/webgpu` only      |

## Testing Methods

### 1. Vitest Tests (Source Testing)

Vitest tests run against **source files** using native ESM resolution. They verify that exports work correctly and that the reconciler behaves as expected in a JSDOM environment.

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm vitest packages/fiber/tests/bundles.test.ts

# Watch mode
pnpm test:watch
```

**What Vitest tests verify:**

- Build flags are exported (`R3F_BUILD_LEGACY`, `R3F_BUILD_WEBGPU`)
- Core functions are exported (`createRoot`, `useThree`, `useFrame`, `extend`)
- WebGPU-specific hooks are available from the webgpu entry
- Event handling and state management correctness

**How Vitest handles THREE.js:**

Unlike our previous Jest setup, Vitest uses a standardized mocking approach in `setupTests.ts` and native ESM resolution. This eliminates the need for complex Babel transformations. For event tests, we use a custom `act` wrapper to synchronize React's state with R3F's frame loop.

### 2. Bundle Verification (Built Output Testing)

The `verify-bundles.js` script analyzes the **built dist files** to ensure each bundle has the correct THREE.js imports.

```bash
# Build first, then verify
pnpm build && pnpm verify-bundles

# Or just verify (if already built)
pnpm verify-bundles
```

**What bundle verification checks:**

- Default bundle contains both `from 'three'` and `from 'three/webgpu'`
- Legacy bundle contains `from 'three'` but NOT `from 'three/webgpu'` or `from 'three/tsl'`
- WebGPU bundle contains `from 'three/webgpu'` but NOT plain `from 'three'`
- All bundles are standalone (no shared chunks)

**Example output:**

```
🔍 Bundle Analysis Report

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
   ✅ Does not contain: from 'three/tsl'
   ✅ Standalone bundle (no shared chunks)

📦 WebGPU entry (@react-three/fiber/webgpu)
   📄 File: dist/webgpu/index.mjs
   📊 Size: 84.85 KB
   ✅ Contains: from 'three/webgpu'
   ✅ Standalone bundle (no shared chunks)

✅ All checks passed! Bundles are correctly optimized.
```

## Testing Workflow

### Before Committing

```bash
# 1. Run all tests
pnpm test

# 2. Build and verify bundles
pnpm build && pnpm verify-bundles
```

### Full Verification (Single Command)

```bash
pnpm build && pnpm verify-bundles && pnpm test
```

### CI/CD

For continuous integration, we run:

```bash
pnpm ci
```

## Test Files

### `packages/fiber/tests/bundles.test.ts`

Tests entry point exports and functionality using dynamic imports.

### `scripts/verify-bundles.js`

Analyzes built output files. Run directly:

```bash
node scripts/verify-bundles.js
```

## Adding New Tests

### Vitest Tests

Add tests to the `tests/` directory with a `.test.ts` or `.test.tsx` extension.

```typescript
import { vi, describe, it, expect } from 'vitest'

describe('My Feature', () => {
  it('should work', async () => {
    const fiber = await import('@react-three/fiber')
    expect(fiber.myFeature).toBeDefined()
  })
})
```

### Bundle Verification

To add new bundle checks, edit `scripts/verify-bundles.js`:

```javascript
const checks = [
  {
    name: 'My Entry',
    file: 'my-entry.mjs',
    shouldContain: ["from 'some-package'"],
    shouldNotContain: ["from 'forbidden-package'"],
    notes: 'Description of what this entry should contain',
  },
]
```

## Troubleshooting

### "Multiple instances of Three.js" warning

We suppress this warning in `setupTests.ts` as it's often a side effect of how test environments resolve multiple THREE entry points.

### Tests fail with "Cannot find module"

Ensure you have installed dependencies and created stubs:

```bash
pnpm install
# or
pnpm stub
```

### Bundle verification fails

1. Make sure you've built first: `pnpm build`
2. Check if the dist folder exists: `ls packages/fiber/dist`
3. Verify the build completed without errors

### snapshots fail

If you've made intentional changes that affect snapshots, update them using:

```bash
pnpm vitest -u
```
