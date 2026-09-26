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

### One build, four entries, one core

`three` and `three/webgpu` are separate bundles that share a core: `three.module.js` is `three.core.js` plus the WebGL renderer, `three.webgpu.js` is `three.core.js` plus the WebGPU renderer and the node system. There is no import that gives you the core alone, and a bundler assigns a module to one chunk: if fiber's core statically imported either bundle, that bundle -- renderer included -- would land in every app's eager graph, whichever renderer the app used. Size-sensitive apps have (loudly) objected to exactly that.

So the four entry points are built in **one rollup run** and fiber's core has **no static import from `three` or `three/webgpu`**. Everything the entries share (the reconciler, the store, events, hooks, `<Environment>`) is emitted once as `dist/shared/fiber.<hash>.mjs`, and each entry is a few kilobytes of glue that imports it.

### Renderer supports

Each renderer is described by a _support_ module, the only two modules in fiber that import three:

| File                    | Imports                     | Carries                                                                                                                |
| :---------------------- | :-------------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| `src/support/webgl.ts`  | `three`                     | `three` namespace, `WebGLRenderer`, `WebGLRenderTarget`, `WebGLCubeRenderTarget`                                       |
| `src/support/webgpu.ts` | `three/webgpu`, `three/tsl` | `three/webgpu` namespace, `WebGPURenderer`, `RenderTarget`, `CubeRenderTarget`, `CanvasTarget`, occlusion node classes |

The shapes are in `types/provider.d.ts`. An entry hands `createRoot`/`Canvas` a **provider**, a loader per renderer it can construct:

```typescript
// src/index.tsx -- both, each downloaded when a root first asks for it
const provider: RendererProvider = {
  webgl: () => import('./support/webgl').then((m) => m.webglSupport),
  webgpu: () => import('./support/webgpu').then((m) => m.webgpuSupport),
}

// src/legacy.tsx -- one, already loaded
const provider: RendererProvider = { webgl: () => webglSupport }
```

`configure()` picks the renderer from the props (`renderer` selects WebGPU on the root entry), awaits its support, and keeps it as `state.internal.support`. That is the moment three is downloaded on the root entry: bundlers emit `dist/chunks/webgl.mjs` and `dist/chunks/webgpu.mjs` as lazy chunks, and an app fetches only the one its Canvas asked for. `/legacy` and `/webgpu` import their support statically, for apps that would rather not have that request; they are the same core.

### How core reaches three

Nothing in `src/core/` knows which renderer it will run with, and nothing there imports a three value:

- **`state.internal.support`** carries the renderer-specific classes core touches by name, and the three namespace of that flavour. JSX element names resolve against explicit `extend()` registrations first, then against `support.three` (`src/core/catalogue.ts`), so a WebGPU root sees node materials and a WebGL root does not. No entry calls `extend(THREE)` at import time any more; that call is what used to force a whole namespace into every entry's eager graph.
- **`getThree()`** (`src/core/three.ts`) is three's _shared core_: `Vector3`, `Scene`, `Raycaster`, the constants. The first support that loads registers its namespace; both flavours export the very same objects for these, so one registration serves every root. It is available before any element renders, hook runs or `onCreated` fires, and throws a pointed error before that.
- **Store objects that are three instances** (`pointer`, `frustum`, the viewport's scratch vectors) are created in `configure()` once the support is loaded, not in `createStore`. Module-level scratch objects (`utils/three.ts`, `visibility.ts`) are created on first use.
- **Three addons** (`three/examples/jsm/*`) import from `three`, so they are loaded with a dynamic import where they are used: the environment decoders in `useEnvironment.tsx` (three's own HDR, EXR, Ultra HDR and cube loaders; no third-party decoder), `GroundedSkybox` in `Environment.tsx`. On the root entry, a WebGPU app that uses an `.hdr`/`.exr` environment therefore also fetches the chunk that holds `three.module.js` (the addon needs it, and the WebGL support shares it), lazily; `/webgpu` has no WebGL support in its graph and avoids that.

```typescript
// In src/core/: types are free, values are not
import type { Scene, Vector3 } from 'three'
import type { WebGPURenderer } from 'three/webgpu'

const scene = new (getThree().Scene)() // shared core
const fbo = new support.CubeRenderTarget(size) // renderer-specific, from the root's support
const { Node } = support.occlusion // WebGPU only
```

### The contract for libraries

A library that imports anything except `Canvas` or `createRoot` from `@react-three/fiber` adds **no renderer** to an app, on any entry, and no second copy of core. `@react-three/fiber/extension` remains the stable, smallest surface for packages that build on fiber (`@react-three/tsl` uses it). `pnpm verify-treeshake` builds such consumers with Vite and esbuild and asserts all of it on the output; see [TESTING.md](./TESTING.md#bundle--type-verification-built-output).

### Element types per entry

`ThreeElementsOf<T>` (`types/three.d.ts`) derives a JSX map from a three namespace. Each entry declares its own `ThreeElements` from it and augments react's `IntrinsicElements` at the bottom of its file: the root entry from `typeof import('three') & typeof import('three/webgpu')`, `/legacy` from `three` only, `/webgpu` from `three/webgpu` only. So `/legacy` never advertises a `<meshBasicNodeMaterial>` it cannot build, and the shared declaration chunk carries no augmentation at all. `import type { ReactThreeFiber } from '@react-three/fiber/legacy'` gives that entry's namespace (`types/entries/*.d.ts`).

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
├── index.{mjs,cjs}          # Default entry: glue + lazy provider
├── legacy.{mjs,cjs}         # Legacy entry: glue + static WebGL support
├── webgpu/
│   └── index.{mjs,cjs}      # WebGPU entry: glue + static WebGPU support
├── extension.{mjs,cjs}      # Three-free surface for libraries
├── chunks/
│   ├── webgl.{mjs,cjs}      # WebGL support: the one module importing `three`
│   └── webgpu.{mjs,cjs}     # WebGPU support: the one module importing `three/webgpu` + `three/tsl`
└── shared/
    └── fiber.<hash>.{mjs,cjs}  # Core, imported by every entry
```

Both `pnpm verify-treeshake` and `pnpm verify-types` run against this output; `pnpm run ci` and CI run them right after the build.

---

## Adding a New Entry Point

To add a specialized bundle (e.g., a new rendering backend):

1. **Create the support** — `src/support/my-backend.ts`, modelled on `src/support/webgl.ts`: the three namespace it registers and the renderer-specific classes core needs (extend `types/provider.d.ts`)
2. **Create the entry** — `src/my-entry.tsx`, modelled on `src/legacy.tsx`: a provider with the support(s) it can construct, the `createRoot`/`Canvas` wrappers, its `R3F_BUILD_*` flags, core re-exports, and its `ThreeExports`/`ThreeElements` with the JSX augmentation
3. **Configure Unbuild** — Add the entry to `entries` in `build.config.ts`; it joins the shared chunk automatically
4. **Update exports** — Add the sub-path to `package.json` exports
5. **Audit** — Add cases to `scripts/verify-treeshake.js`, `scripts/verify-types.js` (+ a consumer in `scripts/type-tests/`), `packages/fiber/tests/entries.test.tsx` and `tests/bundles.test.ts`

---

## Publishing `@react-three/tsl` for the first time

`@react-three/tsl` is in `scripts/release.js` and `.github/workflows/canary.yml`. The canary publishes with npm trusted publishing (OIDC, no token), which can only be configured for a package that already exists on npm, so the very first version is published by hand, as a canary, **before** the change that adds tsl to the canary workflow is merged. Otherwise the first canary run after that merge fails at tsl, after fiber and test-renderer have already published.

1. **Check out the branch that adds tsl to the canary workflow** (not `v10`) and build from a clean install: `pnpm install && pnpm build && pnpm verify-treeshake && pnpm verify-types`.
2. **Publish the first version by hand**, logged in to npm as a `@react-three` maintainer, stamped like the workflow stamps canaries:

   ```bash
   cd packages/tsl
   npm version "10.0.0-canary.$(git rev-parse --short HEAD)" --no-git-tag-version
   pnpm publish --tag canary --access public --no-git-checks --dry-run   # check name, version, files
   pnpm publish --tag canary --access public --no-git-checks
   git checkout package.json
   ```

   `--no-git-checks` skips pnpm's publish-branch check (it expects `master`/`main`; the canary workflow passes the same flag). On a brand-new package npm also points `latest` at this first version; fix that later with `npm dist-tag add` once there is a real release.

3. **Configure trusted publishing** on npmjs.com → `@react-three/tsl` → Settings: GitHub Actions, repository `pmndrs/react-three-fiber`, workflow `canary.yml`.
4. **Merge the branch.** From then on every push to `v10` publishes a tsl canary next to fiber's, and `pnpm release` publishes it with the other packages (its version is bumped by hand with theirs).

tsl's peer range, `^10.0.0-alpha.6`, accepts every fiber canary and every release after `10.0.0-alpha.5`, the last version without the `@react-three/fiber/extension` entry tsl needs.

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
