# @react-three/eslint-plugin

## 1.0.0-alpha.2

### Major Changes

- 1692803: Aggregate alpha.2 changeset, applied across all four published packages. The entries
  below are `@react-three/fiber` changes — see that package's changelog for the authoritative list.

  **Features**
  - Canvas Size Control: `width`/`height` props on Canvas for explicit resolution control;
    `setSize()` gains a square shorthand and reset; imperative `setSize(w, h)` takes ownership
    until `setSize()` resets it
  - ScopedStore for type-safe uniform/node access: `createScopedStore<T>()` removes manual casting
    in creator functions; new `ScopedStoreType<T>` and `CreatorState` exports
  - HMR support for TSL hooks: Canvas detects Vite/webpack HMR and rebuilds nodes/uniforms; new
    `hmr` prop, `rebuildNodes()` and `rebuildUniforms()` utils

  **Bug Fixes**
  - `useNodes()` / `useUniforms()` reader modes not updating when the store changes
  - `usePostProcessing` callbacks not re-running after HMR
  - Absolute Windows paths in bundled type declarations (`FiberRoot` now defined locally)
  - eslint-plugin codegen not awaiting prettier format

  **Maintenance**
  - Migrated to ESLint 9 flat config
  - Updated Vite to v7, Prettier to v3, Husky to v9, lint-staged to v16
  - Converted `verify-bundles.js` to ES modules

## 0.2.0-alpha.1

### Patch Changes

- Aggregate changes merged since the last release.

## 0.2.0-alpha.0

### Minor Changes

- ## R3F v10 - WebGPU Support & React 19

  ### Breaking Changes
  - **React 19 required** - Minimum React version is now 19.0
  - **Three.js 0.181+ required** - Minimum Three.js version is now 0.181.2
  - **New entry points** - Bundle structure reorganized with dedicated WebGPU support

  ### New Features
  - **WebGPU Renderer Support** - New `@react-three/fiber/webgpu` entry point with full WebGPU and TSL (Three.js Shading Language) support
  - **Legacy Entry Point** - `@react-three/fiber/legacy` for WebGL-only environments
  - **Improved Frame Loop** - Enhanced `useFrame` with better priority scheduling and `runOnce` support
  - **Build System Migration** - Moved from Preconstruct to Unbuild for better per-entry-point optimization

  ### Entry Points

  ```js
  // Default - WebGL + WebGPU support
  import { Canvas } from '@react-three/fiber'

  // WebGPU only - smaller bundle, TSL support
  import { Canvas } from '@react-three/fiber/webgpu'

  // Legacy WebGL only - maximum compatibility
  import { Canvas } from '@react-three/fiber/legacy'
  ```

  See the full migration guide in the documentation.

## 0.1.2

### Patch Changes

- 6c907263: fix(eslint-plugin): include type declare files

## 0.1.0

### Minor Changes

- 75521d21: Initial release of the eslint plugin containing two rules, `no-clone-in-loop` and `no-new-in-loop`.
