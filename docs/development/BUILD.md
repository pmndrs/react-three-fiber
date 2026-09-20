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

### One build, three entries, one core

`three` and `three/webgpu` are separate bundles that share a core: `three.module.js` is `three.core.js` plus the WebGL renderer, `three.webgpu.js` is `three.core.js` plus the WebGPU renderer and the node system. There is no import that gives you the core alone, but there is a _set of names_ both export, and that set is all core needs.

So the three entry points are built in **one rollup run**. Everything they share (the reconciler, the store, events, hooks, `<Environment>`) is emitted once as `dist/shared/fiber.<hash>.mjs`, and each entry is a few kilobytes of glue that imports it. An app that mixes entries (its own `Canvas` from `/webgpu`, a library's hooks from the root) loads core once.

### How core stays renderer-free

Nothing in `src/core/` knows which renderer it will run with:

- **Core imports `three`, and only names that `three/webgpu` also exports.** Those live in `three.core.js`, which both builds share, so `Vector3` from `three` and `Vector3` from `three/webgpu` are one class and the shared chunk depends on neither renderer.
- **Renderer classes arrive through a provider.** Each entry builds one (`types/provider.d.ts`): `{ namespace, webgl?, webgpu? }`, where `webgl` carries the `WebGLRenderer`, its cube render target and a lazy loader for the gain map decoder, and `webgpu` carries the `WebGPURenderer`, `CanvasTarget`, its cube render target and the node classes the occlusion observer needs. It goes to core's `createRoot`/`Canvas`; `configure()` picks one flavor for the root and keeps it as `state.internal.support`, which `<Environment>`, `useEnvironment` and the occlusion observer read.
- **WebGL-only dependencies ride with the WebGL provider.** The gain map decoder `useEnvironment` uses for `.webp` renders with its own `WebGLRenderer`, so `webgl.loadGainMapLoader` fetches it on first use and the WebGPU entry has no reference to it at all. A bundler puts a module's code in the chunk that first needs it, so a WebGL dependency anywhere in the WebGPU graph, even behind a dynamic import, would put three's WebGL renderer in every WebGPU app.
- **Entries have no top-level side effects, and nothing is copied out of their namespace.** The THREE namespace an entry offers as JSX elements goes to core as `provider.namespace` and is kept on the root's store. `createInstance` resolves an element name against explicit `extend()` registrations first, then against the namespace of the entry that created the root (`src/core/catalogue.ts`). So an explicit `extend()` always wins, whenever it was made, and a root only ever sees its own entry's classes.

Together those mean an entry's renderer is reachable only through its `createRoot` and `Canvas`. A bundler that sees those unused drops them, the provider, and the renderer with them.

### The contract for libraries

A library that imports anything except `Canvas` or `createRoot` from `@react-three/fiber` adds **no renderer** to an app on `/webgpu` or `/legacy`, and no second copy of core. That is what lets a library support v9 and v10 from a single root import without inflating a v10 app. `verify-treeshake` builds such a consumer with Vite for each combination and asserts it on the output.

### Importing three in source

```typescript
// Shared Three.js classes for core.
import { Vector3, Raycaster } from 'three'
import type { WebGPURenderer } from 'three/webgpu' // types are free

// src/webgpu/: WebGPU-only code may import the WebGPU build directly
import { Node } from 'three/webgpu'
import { uniform } from 'three/tsl'

// A renderer-specific class in core? It goes on the entry's provider, and core reads the flavor
// the root ended up with from the store:
const support = useThree((state) => state.internal.support)
const fbo = new support.CubeRenderTarget(size)
```

Each entry is one file (`src/index.tsx`, `src/legacy.tsx`, `src/webgpu/index.tsx`) holding everything specific to it: the THREE namespace it registers, its `R3F_BUILD_*` flags, its provider, the `createRoot`/`Canvas` wrappers and its JSX element types. The legacy and WebGPU entries register `three` and `three/webgpu` directly; the root registers both, and `src/three/index.ts` exists only because that merged namespace needs `export *` to stay tree-shakeable.

The element types differ per entry the same way, declared at the bottom of each entry file: the legacy declaration has no `<meshBasicNodeMaterial>`, the WebGPU one no `<webGLRenderer>`. Core's own types are shared and entry-agnostic.

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
├── index.{mjs,cjs}          # Default entry (glue only)
├── legacy.{mjs,cjs}         # Legacy/WebGL-only entry (glue only)
├── webgpu/
│   └── index.{mjs,cjs}      # WebGPU-only entry (glue + WebGPU hooks)
└── shared/
    └── fiber.<hash>.{mjs,cjs}  # Core, imported by all three entries
```

### Verifying a build

Run after `pnpm build`. Both checks run in `pnpm run ci` and CI:

| Script             | Checks                                                                                                           |
| :----------------- | :--------------------------------------------------------------------------------------------------------------- |
| `verify-types`     | Entry-specific public types and portable declarations                                                            |
| `verify-treeshake` | Vite consumer bundles contain one core and only the expected renderers, with minimal overhead from mixed imports |

---

## Adding a New Entry Point

To add a specialized bundle (e.g., a new rendering backend):

1. **Create the entry** — `src/my-entry.tsx`, modelled on `src/legacy.tsx`: the THREE namespace it registers, its `R3F_BUILD_*` flags, a `RendererProvider` with the flavor(s) it can construct, the `createRoot`/`Canvas` wrappers, core re-exports, and its `ThreeExports`/`ThreeElements` with the JSX augmentation
2. **Configure Unbuild** — Add the entry to `entries` in `build.config.ts`; it joins the shared chunk automatically
3. **Update exports** — Add the sub-path to `package.json` exports
4. **Audit** — Add it to `scripts/verify-treeshake.js`, `packages/fiber/tests/bundles.test.ts` and `tests/entries.test.tsx`

---

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
