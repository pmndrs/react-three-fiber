# Build System & Tooling

This document explains the build system, package manager, and tooling choices for `@react-three/fiber`.

## Table of Contents

- [Package Manager: pnpm](#package-manager-pnpm)
- [Build System: Unbuild](#build-system-unbuild)
- [Migration History](#migration-history)
- [Future Considerations](#future-considerations)

---

## Package Manager: pnpm

### Current Setup

We use **pnpm**, providing excellent performance, efficient disk usage, and a strict dependency resolution model that's ideal for monorepos.

**Configuration:** [`pnpm-workspace.yaml`](../pnpm-workspace.yaml)

### Why pnpm?

**Benefits:**

- ✅ **Superior performance** - Faster installs and more efficient caching than Yarn or npm.
- ✅ **Content-addressable storage** - Saves disk space by sharing dependencies across projects via hard links.
- ✅ **Strict dependency resolution** - Prevents "phantom dependencies" (packages using dependencies they don't explicitly declare).
- ✅ **First-class monorepo support** - Excellent workspace management and filtering capabilities.
- ✅ **Deterministic** - Highly reliable lockfile and installation process.

**Migration from Yarn:**

- Migrated in early 2026 to improve build stability and CI performance.
- Replaced `.yarnrc.yml` and `yarn.lock` with `pnpm-workspace.yaml` and `pnpm-lock.yaml`.
- Normalized all scripts to use `pnpm` workspace commands.

---

## Build System: Unbuild

### Current Setup

We use **[unbuild](https://github.com/unjs/unbuild)** for building all packages.

**Configuration:** [`packages/fiber/build.config.ts`](../packages/fiber/build.config.ts)

### Why Unbuild?

Unbuild provides per-entry-point build configuration, which is critical for our THREE.js import strategy.

**Key Features:**

1. **Per-Entry Alias Resolution** - Each entry point can resolve imports differently:

   ```typescript
   // All source files import from #three
   import { WebGLRenderer } from '#three'

   // During build, #three resolves differently:
   // - Default entry: src/three/index.ts (WebGL + WebGPU)
   // - Legacy entry: src/three/legacy.ts (WebGL only)
   // - WebGPU entry: src/three/webgpu.ts (WebGPU only)
   ```

2. **Stub Mode for Development** - `unbuild --stub` creates lightweight stubs:

   ```javascript
   // dist/index.mjs (stub)
   import * as module from '../src/index.tsx'
   export * from '../src/index.tsx'
   export default module.default
   ```

   This means code changes are reflected immediately without rebuilding.

3. **No Shared Chunks** - Each entry is a standalone bundle, preventing the shared chunk issues we had with Preconstruct.

4. **Dual CJS/ESM Support** - Native `.mjs` and `.cjs` outputs that are fully compliant with modern Node.js standards.

### Build Outputs

```
packages/fiber/dist/
├── index.cjs          # Default entry (CommonJS)
├── index.mjs          # Default entry (ESM)
├── legacy.cjs         # Legacy/WebGL-only (CommonJS)
├── legacy.mjs         # Legacy/WebGL-only (ESM)
└── webgpu/
    ├── index.cjs      # WebGPU-only (CommonJS)
    └── index.mjs      # WebGPU-only (ESM)
```

### Development Workflow

```bash
# Install and stub (automatic)
pnpm install

# Manual stub generation
pnpm stub
# or
pnpm dev
# or
pnpm build --stub

# Production build
pnpm build

# Verify bundle integrity
pnpm verify-bundles
```

See [DEVELOPMENT](./DEVELOPMENT.md) for detailed development workflows.

---

## Migration History

### From Jest to Vitest (v10.0.0)

**Date:** Early 2026

**Reason:** Jest had significant overhead in JSDOM environments, especially with React 19 and modern ESM. Vitest provides a faster, native ESM experience with better HMR and developer experience.

**Migration Impact:**

- ✅ **Performance**: Full suite runs ~2x faster.
- ✅ **Native ESM**: No more complex Babel transformations for tests.
- ✅ **React 19 Compatibility**: Simplified `act` synchronization and event simulation in JSDOM.

### From Yarn to pnpm (v10.0.0)

**Date:** Early 2026

**Reason:** pnpm's strictness and efficiency make it the preferred choice for modern React monorepos, especially as we scale with WebGPU and multiple entry points.

### From Preconstruct to Unbuild (v10.0.0)

**Date:** Late 2025

**Reason:** Preconstruct couldn't support per-entry alias resolution, which is essential for our THREE.js import strategy.

**Migration Impact:**

- ✅ Simpler project structure (no stub folders)
- ✅ Better tree-shaking and bundle optimization
- ✅ Per-entry THREE.js import control
- ✅ Faster development with better stub support
- ✅ More predictable builds

**CI/CD:** This project uses GitHub Actions (`.github/workflows/test.yml`) which has been updated for pnpm and Vitest.

## 🧩 Architecture Details

### How Alias Resolution Works

The key feature of our build system is **per-entry-point alias resolution**. All source files import from `#three`:

```typescript
// src/core/renderer.tsx
import { WebGLRenderer, WebGPURenderer } from '#three'
```

During build, `#three` resolves differently for each entry:

| Entry       | `#three` resolves to  | Result              |
| :---------- | :-------------------- | :------------------ |
| **Default** | `src/three/index.ts`  | Both WebGL + WebGPU |
| **Legacy**  | `src/three/legacy.ts` | WebGL only          |
| **WebGPU**  | `src/three/webgpu.ts` | WebGPU only         |

This is configured in `packages/fiber/build.config.ts` using a custom Rollup alias plugin.

---

## 🆕 Adding a New Entry Point

If you need to add a specialized bundle (e.g., for a new rendering backend):

1.  **Create Entry File**: Create `src/my-entry.tsx`. It usually just exports everything from `./core` and re-exports specific build flags from `#three`.
2.  **Create THREE Variant**: Create `src/three/my-variant.ts` to define which parts of the Three.js ecosystem are included.
3.  **Configure Unbuild**: Add a new entry to `build.config.ts`.
4.  **Update exports**: Add the new sub-path to `package.json`'s `exports` field.
5.  **Audit**: Add the new file to `scripts/verify-bundles.js` and add a corresponding test in `packages/fiber/tests/bundles.test.ts`.

---

## 🚀 Release Strategy

For the current Alpha Stage procedures, see the **[Alpha Release Guide](./ALPHA-RELEASE.md)**.
