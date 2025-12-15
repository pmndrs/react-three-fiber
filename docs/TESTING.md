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

### 1. Jest Tests (Source Testing)

Jest tests run against **source files** via babel, not built bundles. They verify that exports work correctly.

```bash
# Run all tests
yarn test

# Run bundle/entry point tests specifically
yarn test packages/fiber/tests/bundles.test.ts

# Watch mode
yarn test:watch
```

**What Jest tests verify:**

- Build flags are exported (`R3F_BUILD_LEGACY`, `R3F_BUILD_WEBGPU`)
- Core functions are exported (`createRoot`, `useThree`, `useFrame`, `extend`)
- WebGPU-specific hooks are available from the webgpu entry

**Important Note:** Jest uses babel which resolves `#three` to the default `three/index.ts` for ALL entry points. This means:

- In Jest: All entry points show `R3F_BUILD_LEGACY=true` and `R3F_BUILD_WEBGPU=true`
- In built bundles: Each entry has correct flags based on its THREE variant

To verify actual bundle imports, use the bundle verification script.

### 2. Bundle Verification (Built Output Testing)

The `verify-bundles.js` script analyzes the **built dist files** to ensure each bundle has the correct THREE.js imports.

```bash
# Build first, then verify
yarn build && yarn verify-bundles

# Or just verify (if already built)
yarn verify-bundles
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
# 1. Run Jest tests
yarn test

# 2. Build and verify bundles
yarn build && yarn verify-bundles
```

### CI/CD

For continuous integration, run both:

```bash
yarn test && yarn build && yarn verify-bundles
```

## Adding New Tests

### Jest Tests

Add tests to `packages/fiber/tests/bundles.test.ts` or create new test files in the `tests/` directory.

```typescript
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

### Tests fail with "Cannot find module"

Run `yarn stub` to generate development stubs:

```bash
yarn stub
```

### Bundle verification fails

1. Make sure you've built first: `yarn build`
2. Check if the dist folder exists: `ls packages/fiber/dist`
3. Verify the build completed without errors

### TypeScript errors in tests

The package.json `types` field points to source files for development. If you see type errors:

1. Ensure TypeScript can resolve the source files
2. Check that `#three` and `#types` aliases are configured in `tsconfig.json`
