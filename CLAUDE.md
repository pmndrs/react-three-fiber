# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

react-three-fiber (R3F) is a React renderer for Three.js that enables declarative 3D graphics with React components. This is a monorepo using pnpm workspaces.

**Current Version**: v10.0.0-alpha.2 (React 19, WebGPU support)

## Essential Commands

```bash
# Development
pnpm install          # Install dependencies (runs postinstall: stub + patch-react-reconciler)
pnpm dev              # Generate stubs (src → dist links for immediate change reflection)
pnpm examples         # Run Vite example app for visual testing
pnpm test:watch       # Watch mode testing

# Building & Verification
pnpm build            # Build fiber + eslint-plugin packages
pnpm verify-treeshake # Bundle consumer apps from dist and check which renderer each carries
pnpm verify-types     # Check the built declarations per entry
pnpm typecheck        # TypeScript type checking

# Code Quality
pnpm eslint           # Run ESLint
pnpm eslint:fix       # Auto-fix linting issues
pnpm format           # Check Prettier formatting
pnpm format:fix       # Auto-fix formatting

# Full CI Suite
pnpm run ci           # build → verify-treeshake → verify-types → typecheck → eslint → dev → test → format

# Single Test File
vitest packages/fiber/tests/hooks.test.tsx
```

## Architecture

### Entry Points

One core, built once, shared by four entries. Core has **no static import from `three` or `three/webgpu`**: each renderer is described by a support module (`src/support/webgl.ts`, `src/support/webgpu.ts`) that owns its three namespace and the renderer-specific classes, and an entry hands `createRoot`/`Canvas` a provider saying how to load them.

| Entry     | Import Path                    | Renderer                                             | Flags                     |
| --------- | ------------------------------ | ---------------------------------------------------- | ------------------------- |
| Default   | `@react-three/fiber`           | Either; `<Canvas renderer>` = WebGPU, loaded lazily  | Both true                 |
| Legacy    | `@react-three/fiber/legacy`    | WebGL, support imported statically                   | LEGACY=true, WEBGPU=false |
| WebGPU    | `@react-three/fiber/webgpu`    | WebGPU, support imported statically                  | LEGACY=false, WEBGPU=true |
| Extension | `@react-three/fiber/extension` | None: hooks, context and the extension registry only | n/a                       |

On the root entry both supports are dynamic imports, so an app downloads only the renderer its Canvas asks for and nothing of three before that. `/legacy` and `/webgpu` skip that request and narrow `useThree`/`useFrame`/`Canvas`/`useRenderTarget` to one renderer's types. The extension entry is the stable surface for packages that build on fiber (`@react-three/tsl`); with one shared core it adds no second copy of anything.

How core reaches three at runtime:

- `state.internal.support` — the loaded support: `kind`, `three` (the namespace, also the JSX constructors for this root), `Renderer`, `RenderTarget`, `CubeRenderTarget`, and on WebGPU `CanvasTarget` + `occlusion`.
- `getThree()` (`src/core/three.ts`) — three's shared core (`Vector3`, `Scene`, constants, ...), registered by the first support that loads. Both flavours export the same objects for these.
- JSX names resolve explicit `extend()` registrations first, then `support.three` (`src/core/catalogue.ts`). No entry calls `extend(THREE)` at import time.

### Package Structure

```
packages/
├── fiber/                  # Core @react-three/fiber package
│   ├── src/
│   │   ├── index.tsx       # Default entry (WebGL + WebGPU)
│   │   ├── legacy.tsx      # Legacy entry (WebGL only)
│   │   ├── core/           # Shared reconciler, hooks, events, store
│   │   ├── webgpu/         # WebGPU-specific code
│   │   └── support/        # webgl.ts / webgpu.ts: the only modules that import three
│   ├── types/              # TypeScript definitions
│   └── tests/              # Vitest tests
├── tsl/                    # @react-three/tsl - TSL resource hooks (built on fiber/extension)
├── eslint-plugin/          # @react-three/eslint-plugin
└── test-renderer/          # @react-three/test-renderer
```

### Key Source Files

- **Reconciler**: `packages/fiber/src/core/reconciler.tsx` - React Reconciler → Three.js mapping
- **Store**: `packages/fiber/src/core/store.ts` - Zustand state (canvas, renderer, scene, camera)
- **Events**: `packages/fiber/src/core/events.ts` - Pointer events, raycasting, event bubbling
- **Canvas**: `packages/fiber/src/core/Canvas.tsx` - Top-level Canvas component
- **Hooks**: `packages/fiber/src/core/hooks/` - useFrame, useThree, useLoader, etc.

### Adding Features

**For all entry points**: Add to `src/core/`, export from `src/core/index.tsx`

**For WebGPU only**: Add to `src/webgpu/`, export from `src/webgpu/index.tsx`. A renderer-specific class core needs goes on the support object (`types/provider.d.ts`, `src/support/*.ts`) and is read from `state.internal.support`.

**TSL resource hooks** (`useUniforms`, `useNodes`, `useRenderPipeline`, ...) live in `packages/tsl`. That package imports fiber only from `@react-three/fiber/extension` (never another entry or fiber's source) and three only from `three/webgpu` / `three/tsl`.

**New THREE.js imports**: In `src/core/`, only `import type`. A class from three's shared core comes from `getThree()`; a renderer-specific one from `state.internal.support`. A three addon (`three/examples/jsm/*`) imports from `three`, so it is loaded with a dynamic import where it is used (see `useEnvironment.tsx`).

### React Reconciler

The react-reconciler package is patched during postinstall (via Vite) and bundled into dist (not externalized). Source is transformed to ESM at `packages/fiber/react-reconciler/`.

## Testing

- **Framework**: Vitest with jsdom environment
- **Coverage**: v8 provider
- **Setup**: `packages/fiber/tests/setupTests.ts` (mocks WebGL2, ResizeObserver, PointerEvent)

Tests run against source files. `pnpm verify-treeshake` bundles consumer apps from the built `dist` with Vite and esbuild and checks which renderer each carries; `pnpm verify-types` checks the built declarations.

## Code Style

- **Prettier**: No semicolons, single quotes, trailing commas, 120 char width
- **ESLint**: Flat config (v9), TypeScript-eslint, React hooks rules
- **Pre-commit**: Husky runs `eslint --fix` on staged files

## Code Patterns

Prefer clean, minimal code patterns:

- **Avoid dead initial assignments**: Don't initialize variables to values that are immediately overwritten in all branches. Use the intended default directly with explicit typing:

  ```tsx
  // Bad - initial value is never used
  let result = state.items
  if (condition1) {
    result = something
  } else if (condition2) {
    result = somethingElse
  } else {
    result = {}
  }

  // Good - default is explicit, unnecessary else removed
  let result: typeof state.items = {}
  if (condition1) {
    result = something
  } else if (condition2) {
    result = somethingElse
  }
  // else: stays as {} (default)
  ```

- **Use `typeof` for type inference** when initializing to a different value than the source but needing the same type

## Commits & Releases

- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`
- **Release**: `pnpm release` (build + publish all packages)

## Common Pitfalls

1. **Never import a value from `three` or `three/webgpu` in `src/core/`** - either one would put that renderer into every app's eager bundle. Types are free; values come from `getThree()` or `state.internal.support`
2. **Run `pnpm dev`** after `pnpm install` if stubs seem stale
3. **Windows symlinks**: May need Developer Mode enabled for stub generation
4. **"Multiple instances of Three.js" warning**: Safe to ignore in tests, suppressed in setupTests.ts

## Dependencies

- **Peer**: react@19, react-dom@19, three@>=0.181.2
- **State**: zustand@5
- **Build**: unbuild with Rollup alias plugin
- **Runtime**: suspend-react, react-use-measure, its-fine, dequal
