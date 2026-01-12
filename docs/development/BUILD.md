# Build System & Architecture

This document explains the build system, package manager, and tooling architecture for `@react-three/fiber`.

---

## Package Manager: pnpm

We use **pnpm** for its performance, strict dependency resolution, and first-class monorepo support.

**Configuration:** `pnpm-workspace.yaml`

//\* Why pnpm? -------------------------------------------

- **Content-addressable storage** — Saves disk space via hard links
- **Strict resolution** — Prevents phantom dependencies
- **Deterministic** — Reliable lockfile and installation

---

## Build System: Unbuild

We use **[Unbuild](https://github.com/unjs/unbuild)** for building all packages.

**Configuration:** `packages/fiber/build.config.ts`

//\* Why Unbuild? ----------------------------------------

Unbuild provides per-entry-point build configuration, which is critical for our THREE.js import strategy.

//\* Per-Entry Alias Resolution --------------------------

Each entry point resolves imports differently:

```typescript
// All source files import from #three
import { WebGLRenderer } from '#three'

// During build, #three resolves differently:
// - Default entry: src/three/index.ts (WebGL + WebGPU)
// - Legacy entry:  src/three/legacy.ts (WebGL only)
// - WebGPU entry:  src/three/webgpu.ts (WebGPU only)
```

| Entry   | `#three` resolves to  | Result         |
| :------ | :-------------------- | :------------- |
| Default | `src/three/index.ts`  | WebGL + WebGPU |
| Legacy  | `src/three/legacy.ts` | WebGL only     |
| WebGPU  | `src/three/webgpu.ts` | WebGPU only    |

This is configured in `build.config.ts` using a custom Rollup alias plugin.

//\* Stub Mode for Development ---------------------------

`unbuild --stub` creates lightweight stubs that redirect to source:

```javascript
// dist/index.mjs (stub)
import * as module from '../src/index.tsx'
export * from '../src/index.tsx'
export default module.default
```

Code changes reflect immediately without rebuilding.

//\* Build Outputs ---------------------------------------

```text
packages/fiber/dist/
├── index.cjs          # Default (CommonJS)
├── index.mjs          # Default (ESM)
├── legacy.cjs         # Legacy/WebGL-only (CommonJS)
├── legacy.mjs         # Legacy/WebGL-only (ESM)
└── webgpu/
    ├── index.cjs      # WebGPU-only (CommonJS)
    └── index.mjs      # WebGPU-only (ESM)
```

---

## Adding a New Entry Point

To add a specialized bundle (e.g., a new rendering backend):

1. **Create Entry File** — `src/my-entry.tsx` (export from `./core`, re-export build flags from `#three`)
2. **Create THREE Variant** — `src/three/my-variant.ts` (define included THREE.js exports)
3. **Configure Unbuild** — Add entry to `build.config.ts`
4. **Update exports** — Add sub-path to `package.json` exports field
5. **Audit** — Add to `scripts/verify-bundles.js` and `packages/fiber/tests/bundles.test.ts`

---

## Migration History

//\* Jest → Vitest (v10) ---------------------------------

Vitest provides faster native ESM testing with better React 19 compatibility.

- Full suite runs ~2x faster
- No complex Babel transformations
- Simplified `act` synchronization in JSDOM

//\* Yarn → pnpm (v10) -----------------------------------

pnpm's strictness and efficiency make it preferred for modern React monorepos.

//\* Preconstruct → Unbuild (v10) ------------------------

Preconstruct couldn't support per-entry alias resolution for our THREE.js import strategy.

- Simpler project structure (no stub folders)
- Better tree-shaking and bundle optimization
- Per-entry THREE.js import control
- Faster development with better stub support
