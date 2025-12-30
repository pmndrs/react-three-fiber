# Build System

This document explains how `@react-three/fiber` is built using [unbuild](https://github.com/unjs/unbuild).

## Overview

The fiber package produces three distinct bundles from largely the same source code:

| Entry Point | Import Path                 | Three.js Target     | Output                        |
| ----------- | --------------------------- | ------------------- | ----------------------------- |
| Default     | `@react-three/fiber`        | Both WebGL + WebGPU | `dist/index.{mjs,cjs}`        |
| Legacy      | `@react-three/fiber/legacy` | WebGL only          | `dist/legacy.{mjs,cjs}`       |
| WebGPU      | `@react-three/fiber/webgpu` | WebGPU only         | `dist/webgpu/index.{mjs,cjs}` |

## Build Configuration

The build is configured in `packages/fiber/build.config.ts`.

### Entry Points

Each entry point is defined as a separate build configuration:

```ts
export default defineBuildConfig([
  // Default - Both WebGL and WebGPU
  { name: 'default', entries: ['src/index.tsx'], outDir: 'dist' },

  // Legacy - WebGL Only
  { name: 'legacy', entries: ['src/legacy.tsx'], outDir: 'dist' },

  // WebGPU - WebGPU Only
  { name: 'webgpu', entries: [{ input: 'src/webgpu/index.tsx', name: 'index' }], outDir: 'dist/webgpu' },
])
```

### The `#three` Alias System

The key to producing different bundles is the `#three` import alias. Throughout the codebase, Three.js is imported via:

```ts
import * as THREE from '#three'
```

This alias resolves to different files depending on which bundle is being built:

| Bundle  | `#three` Resolves To  | Exports                         |
| ------- | --------------------- | ------------------------------- |
| Default | `src/three/index.ts`  | Both WebGL and WebGPU renderers |
| Legacy  | `src/three/legacy.ts` | WebGL renderer only             |
| WebGPU  | `src/three/webgpu.ts` | WebGPU renderer only            |

This is accomplished via Rollup's alias plugin, configured per-entry:

```ts
function createAliasPlugin(threeVariant: 'default' | 'legacy' | 'webgpu') {
  return alias({
    entries: [
      { find: /^#three\/tsl$/, replacement: threeAliases.tsl },
      { find: /^#three$/, replacement: threeAliases[threeVariant] },
      { find: /^#types$/, replacement: typesAlias },
    ],
  })
}
```

### Other Aliases

- `#three/tsl` - Resolves to TSL (Three.js Shading Language) exports for WebGPU
- `#types` - Resolves to the types barrel file (`types/index.ts`)

## Package Exports

The `package.json` uses the `exports` field to map import paths to the correct bundles:

```json
{
  "exports": {
    ".": {
      "types": "./src/index.tsx",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./legacy": {
      "types": "./src/legacy.tsx",
      "import": "./dist/legacy.mjs",
      "require": "./dist/legacy.cjs"
    },
    "./webgpu": {
      "types": "./src/webgpu/index.tsx",
      "import": "./dist/webgpu/index.mjs",
      "require": "./dist/webgpu/index.cjs"
    }
  }
}
```

## Build Commands

```bash
# Build all bundles
yarn build

# Development mode with stub files (faster iteration)
yarn stub

# Patch react-reconciler to ESM (runs automatically during postinstall)
yarn patch-react-reconciler
```

## React Reconciler Patching

The package includes a patching system for `react-reconciler` to convert it from CJS to ESM format. This is necessary because the official `react-reconciler` package has ESM compatibility issues.

### How it works:

1. **Automatic patching**: During `yarn install`, the `postinstall` script runs `yarn patch-react-reconciler`
2. **Vite transformation**: Uses `vite build` (configured in root `vite.config.ts`) to:
   - Bundle `react-reconciler` from `node_modules`
   - Convert CJS constants to ESM exports
   - Copy TypeScript definitions
   - Output to `packages/fiber/react-reconciler/`
3. **Build aliasing**: `build.config.ts` aliases `react-reconciler` imports to the patched version
4. **Test integration**: `jest.config.js` also uses the patched version for tests

### Output:

```
packages/fiber/react-reconciler/
├── index.js          # Main reconciler bundle (ESM)
├── index.d.ts        # TypeScript definitions
├── constants.js      # Constants bundle (ESM)
└── constants.d.ts    # Constants TypeScript definitions
```

This directory is gitignored and regenerated on install.

### Testing and Building:

Both tests and builds use the **same patched reconciler** to ensure consistency:

- **Source code** imports via relative paths: `../../react-reconciler/index.js`
- **Build time** (unbuild): Bundles the patched ESM version directly into `dist/` files
- **Test time** (Jest): Transforms the patched ESM files to CJS on-the-fly using babel-jest

This ensures you test exactly what you ship.

## Output Structure

After building, the `dist/` folder contains:

```
dist/
├── index.mjs        # Default ESM bundle
├── index.cjs        # Default CommonJS bundle
├── legacy.mjs       # Legacy ESM bundle
├── legacy.cjs       # Legacy CommonJS bundle
└── webgpu/
    ├── index.mjs    # WebGPU ESM bundle
    └── index.cjs    # WebGPU CommonJS bundle
```

## Externals

Dependencies are externalized (not bundled) to keep bundle sizes small:

- React ecosystem: `react`, `react-dom`, `react-reconciler`, `scheduler`
- Three.js: `three`, `three/webgpu`, `three/tsl`
- State management: `zustand`, `zustand/shallow`
- Utilities: `its-fine`, `suspend-react`, `react-use-measure`, `dequal`

## Types

Currently, types are served directly from source files (`./src/index.tsx`) rather than generated declaration files. This provides the most accurate type information during development.
