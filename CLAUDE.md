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
pnpm verify-bundles   # Verify THREE.js imports are correct per entry point
pnpm typecheck        # TypeScript type checking

# Code Quality
pnpm eslint           # Run ESLint
pnpm eslint:fix       # Auto-fix linting issues
pnpm format           # Check Prettier formatting
pnpm format:fix       # Auto-fix formatting

# Full CI Suite
pnpm ci               # build → typecheck → eslint → dev → test → format

# Single Test File
vitest packages/fiber/tests/hooks.test.tsx
```

## Architecture

### Entry Points

R3F has three entry points with different THREE.js imports controlled via `#three` alias resolution:

| Entry   | Import Path                 | THREE Imports  | Build Flags               |
| ------- | --------------------------- | -------------- | ------------------------- |
| Default | `@react-three/fiber`        | WebGL + WebGPU | Both true                 |
| Legacy  | `@react-three/fiber/legacy` | WebGL only     | LEGACY=true, WEBGPU=false |
| WebGPU  | `@react-three/fiber/webgpu` | WebGPU only    | LEGACY=false, WEBGPU=true |

The `#three` alias resolves to different files per entry point during build (configured in `packages/fiber/build.config.ts`):

- Default → `src/three/index.ts`
- Legacy → `src/three/legacy.ts`
- WebGPU → `src/three/webgpu.ts`

### Package Structure

```
packages/
├── fiber/                  # Core @react-three/fiber package
│   ├── src/
│   │   ├── index.tsx       # Default entry (WebGL + WebGPU)
│   │   ├── legacy.tsx      # Legacy entry (WebGL only)
│   │   ├── core/           # Shared reconciler, hooks, events, store
│   │   ├── webgpu/         # WebGPU-specific code
│   │   └── three/          # #three alias resolution files
│   ├── types/              # TypeScript definitions
│   └── tests/              # Vitest tests
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

**For WebGPU only**: Add to `src/webgpu/`, export from `src/webgpu/index.tsx`

**New THREE.js imports**: Update the appropriate file in `src/three/` and import via `#three` in core code

### React Reconciler

The react-reconciler package is patched during postinstall (via Vite) and bundled into dist (not externalized). Source is transformed to ESM at `packages/fiber/react-reconciler/`.

## Testing

- **Framework**: Vitest with jsdom environment
- **Coverage**: v8 provider
- **Setup**: `packages/fiber/tests/setupTests.ts` (mocks WebGL2, ResizeObserver, PointerEvent)

Tests run against source files. Bundle verification (`pnpm verify-bundles`) checks built dist files for correct THREE.js imports.

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

1. **Always import from `#three`** in core code, never directly from `three` - the alias resolution handles per-entry imports
2. **Run `pnpm dev`** after `pnpm install` if stubs seem stale
3. **Windows symlinks**: May need Developer Mode enabled for stub generation
4. **"Multiple instances of Three.js" warning**: Safe to ignore in tests, suppressed in setupTests.ts

## Dependencies

- **Peer**: react@19, react-dom@19, three@>=0.181.2
- **State**: zustand@5
- **Build**: unbuild with Rollup alias plugin
- **Runtime**: suspend-react, react-use-measure, its-fine, dequal
