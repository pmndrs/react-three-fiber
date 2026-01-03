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

---

## 🛠️ Troubleshooting

### "Multiple instances of Three.js"

A common warning in Vitest/JSDOM. It is usually safe to ignore in tests as long as functionality is verified. We suppress the most common variants in `setupTests.ts`.

### Tests fail with "Cannot find module"

1.  Ensure you have run `pnpm install`.
2.  If the error references `dist` files, run `pnpm stub` to regenerate the development links.

### Bundle verification failure

1.  **Build first**: You must run `pnpm build` before running `pnpm verify-bundles`.
2.  **Check imports**: If a bundle correctly contains forbidden imports (e.g., `three/webgpu` in the legacy bundle), check your `#three` alias resolution in `build.config.ts`.

---

## 🏗️ Methodology

We use a two-tier verification strategy:

1.  **Vitest (Source)**: Fast, iterative testing of logic, hooks, and reconciliation.
2.  **Bundle Verification (Dist)**: Static analysis of built assets to ensure optimization and correct tree-shaking for our various entry points.
