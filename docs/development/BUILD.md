# Build System & Architecture

This document explains the build system, package manager, and tooling architecture for `@react-three/fiber`.

---

## Package Manager: pnpm

We use **pnpm** for its performance, strict dependency resolution, and first-class monorepo support.

**Configuration:** `pnpm-workspace.yaml`

### Why pnpm?

- **Content-addressable storage** — Saves disk space via hard links
- **Strict resolution** — Prevents phantom dependencies
- **Deterministic** — Reliable lockfile and installation

---

## Build System: Unbuild

We use **[Unbuild](https://github.com/unjs/unbuild)** for building all packages.

**Configuration:** `packages/fiber/build.config.ts`

### Why Unbuild?

Unbuild provides per-entry-point build configuration, which is critical for our THREE.js import strategy.

### Per-Entry Alias Resolution

**Why this exists.** `three` and `three/webgpu` are separate bundles, and each is a superset of three's core: importing from root `three` gives you core + the WebGL renderer, importing from `three/webgpu` gives you core + WebGPU. There is no import that gives you core alone. If R3F imported from `three` throughout, every consumer would ship the WebGL renderer even on a WebGPU-only app — megabytes that size-sensitive apps have (loudly) objected to.

So all source imports go through a single `#three` alias, and the build points that alias at a different file per entry. That is the whole reason we need per-entry build config, and it is why `verify-bundles` exists: it asserts each built bundle imports only what it should.

Each entry point resolves imports differently:

```typescript
// All source files import from #three
import { WebGLRenderer } from '#three'

// During build, #three resolves differently:
// - Default entry: src/three/index.ts (WebGL + WebGPU)
// - Legacy entry:  src/three/legacy.ts (WebGL only)
// - WebGPU entry:  src/three/webgpu.ts (WebGPU only)
```

`packages/fiber/src/three/` is the single source of truth for what each entry pulls in:

| File        | Purpose                             | Used by                          |
| :---------- | :---------------------------------- | :------------------------------- |
| `index.ts`  | Default (WebGPU + deprecated WebGL) | Root `@react-three/fiber` import |
| `legacy.ts` | WebGL only                          | `@react-three/fiber/legacy`      |
| `webgpu.ts` | WebGPU only (no legacy)             | `@react-three/fiber/webgpu`      |
| `tsl.ts`    | TSL convenience exports             | WebGPU builds                    |

This is wired up in `build.config.ts` using a custom Rollup alias plugin. Adding a THREE.js import means adding it to the appropriate file above, never importing `three` directly in core code.

### Importing `#three` in source

```typescript
// Namespace import
import * as THREE from '#three'

// Named imports
import { WebGPURenderer, Inspector, type WebGLShadowMap } from '#three'

// TSL imports (webgpu builds only)
import { uniform, vec3, Fn } from '#three/tsl'
```

For editors and `tsc`, the alias is declared in the root `tsconfig.json` — the build resolves it separately, so both have to agree:

```json
{
  "compilerOptions": {
    "paths": {
      "#three": ["packages/fiber/src/three/index.ts"],
      "#three/*": ["packages/fiber/src/three/*"]
    }
  }
}
```

### Stub Mode for Development

`unbuild --stub` creates lightweight stubs that redirect to source:

```javascript
// dist/index.mjs (stub)
import * as module from '../src/index.tsx'
export * from '../src/index.tsx'
export default module.default
```

Code changes reflect immediately without rebuilding.

### Build Outputs

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

## Publishing `@react-three/tsl` for the first time

`@react-three/tsl` builds and tests with the rest of the monorepo, but it is deliberately **not** in `scripts/release.js` or `.github/workflows/canary.yml` yet. The canary publishes with npm trusted publishing (OIDC, no token), which can only be configured for a package that already exists on npm. Adding tsl to the canary before that would fail every push to `v10` after fiber and test-renderer had already published.

1. **Build and check** from the repo root: `pnpm build && pnpm verify-bundles && pnpm verify-types`.
2. **Publish the first version by hand**, logged in to npm as a `@react-three` maintainer:
   `pnpm --filter @react-three/tsl publish --tag alpha --access public`.
   The version must match fiber's (the release script refuses mixed channels).
3. **Configure trusted publishing** on npmjs.com → `@react-three/tsl` → Settings: GitHub Actions, repository `pmndrs/react-three-fiber`, workflow `canary.yml`.
4. **Add tsl to the automation**:
   - `scripts/release.js`: add `'tsl'` to `PACKAGES`, after `'fiber'` (it declares a peer on fiber).
   - `.github/workflows/canary.yml`: add `tsl` to the `for pkg in ...` version loop, and a `pnpm --filter @react-three/tsl publish --tag canary --no-git-checks --provenance` line after fiber's.

To check the package as npm will see it without publishing: `cd packages/tsl && pnpm pack`, then install the tarball (next to a packed fiber) into a fresh app.

## Migration History

### Jest → Vitest (v10)

Vitest provides faster native ESM testing with better React 19 compatibility.

- Full suite runs ~2x faster
- No complex Babel transformations
- Simplified `act` synchronization in JSDOM

### Yarn → pnpm (v10)

pnpm's strictness and efficiency make it preferred for modern React monorepos.

### Preconstruct → Unbuild (v10)

Preconstruct couldn't support per-entry alias resolution for our THREE.js import strategy.

- Simpler project structure (no stub folders)
- Better tree-shaking and bundle optimization
- Per-entry THREE.js import control
- Faster development with better stub support
