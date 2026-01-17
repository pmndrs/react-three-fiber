# @react-three/eslint-plugin

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
