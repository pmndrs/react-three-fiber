# Testing Guide

This guide covers testing strategies for `@react-three/fiber` entry points and bundle verification.

---

## Entry Points Overview

R3F has three entry points, each with different THREE.js imports:

| Entry Point | Import                      | THREE Imports            |
| :---------- | :-------------------------- | :----------------------- |
| Default     | `@react-three/fiber`        | `three` + `three/webgpu` |
| Legacy      | `@react-three/fiber/legacy` | `three` only             |
| WebGPU      | `@react-three/fiber/webgpu` | `three/webgpu` only      |

---

## Vitest Tests (Source Testing)

Vitest tests run against **source files** using native ESM resolution.

```bash
pnpm test                              # Run all tests
pnpm test:watch                        # Watch mode
pnpm vitest packages/fiber/tests/foo.test.ts  # Specific file
```

//\* What Vitest Tests Verify ----------------------------

- Build flags are exported (`R3F_BUILD_LEGACY`, `R3F_BUILD_WEBGPU`)
- Core functions are exported (`createRoot`, `useThree`, `useFrame`, `extend`)
- WebGPU-specific hooks are available from the webgpu entry
- Event handling and state management correctness

//\* THREE.js Mocking ------------------------------------

Vitest uses standardized mocking in `setupTests.ts` with native ESM resolution. No complex Babel transformations required.

---

## Bundle Verification (Built Output)

The `verify-bundles.js` script analyzes **built dist files** to ensure correct THREE.js imports.

```bash
pnpm build && pnpm verify-bundles
```

//\* What Bundle Verification Checks ---------------------

- Default bundle contains both `from 'three'` and `from 'three/webgpu'`
- Legacy bundle contains `from 'three'` but NOT `from 'three/webgpu'` or `from 'three/tsl'`
- WebGPU bundle contains `from 'three/webgpu'` but NOT plain `from 'three'`
- All bundles are standalone (no shared chunks)

//\* Example Output --------------------------------------

```text
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

---

## Testing Workflow

//\* Before Committing -----------------------------------

```bash
pnpm test
pnpm build && pnpm verify-bundles
```

//\* Full Verification -----------------------------------

```bash
pnpm build && pnpm verify-bundles && pnpm test
```

//\* CI --------------------------------------------------

```bash
pnpm ci
```

---

## Troubleshooting

//\* Development Issues ----------------------------------

**Changes not showing?**
Run `pnpm stub` to regenerate development links from `dist/` → `src/`.

**Import errors in IDE?**
Restart your TypeScript server or run `pnpm typecheck`.

**"EPERM" errors on Windows?**
Enable [Developer Mode](https://howtogeek.com/292914/what-is-developer-mode-in-windows-10) for symlink support.

//\* Test Issues -----------------------------------------

**"Multiple instances of Three.js" warning**
Common in Vitest/JSDOM. Usually safe to ignore — we suppress common variants in `setupTests.ts`.

**"Cannot find module" errors**

1. Ensure `pnpm install` has been run
2. If error references `dist` files, run `pnpm stub` to regenerate development links

//\* Bundle Verification Issues --------------------------

**Verification fails**

1. You must run `pnpm build` before `pnpm verify-bundles`
2. If a bundle incorrectly contains forbidden imports, check `#three` alias resolution in `build.config.ts`

**Package too small in dry-run**
If `npm pack --dry-run` shows ~100-200 KB instead of ~1 MB, the `dist/` folder is being excluded. Ensure the package's `package.json` has a `files` field that explicitly includes `dist`.
