# @react-three/eslint-plugin

## 1.0.0-alpha.2

### Major Changes

- 1692803: Features Canvas Size Control - Added width and height props to Canvas for explicit resolution control - Enhanced setSize() API with square shorthand and reset capability - Ownership model: imperative setSize(w, h) takes control until setSize() resets ScopedStore for Type-Safe Uniform/Node Access - New createScopedStore<T>() wrapper for TypeScript-friendly access to uniforms/nodes - Eliminates manual casting in creator functions - New exports: ScopedStoreType<T>, CreatorState HMR Support for TSL Hooks - Automatic Hot Module Replacement for WebGPU TSL hooks - Canvas detects Vite/webpack HMR events and rebuilds nodes/uniforms - New hmr prop on Canvas, rebuildNodes(), rebuildUniforms() utils Bug Fixes - Fixed useNodes() and useUniforms() reader modes not updating when store changes - Fixed usePostProcessing callbacks not re-running after HMR - Fixed absolute Windows paths in bundled type declarations (FiberRoot now defined locally) - Fixed eslint-plugin codegen not awaiting prettier format Maintenance - Migrated to ESLint 9 flat config - Updated Vite to v7, Prettier to v3, Husky to v9, lint-staged to v16 - Converted verify-bundles.js to ES modules ---

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
