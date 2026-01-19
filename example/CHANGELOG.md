# example

## 0.0.1-alpha.1

### Patch Changes

- 1692803: Features Canvas Size Control - Added width and height props to Canvas for explicit resolution control - Enhanced setSize() API with square shorthand and reset capability - Ownership model: imperative setSize(w, h) takes control until setSize() resets ScopedStore for Type-Safe Uniform/Node Access - New createScopedStore<T>() wrapper for TypeScript-friendly access to uniforms/nodes - Eliminates manual casting in creator functions - New exports: ScopedStoreType<T>, CreatorState HMR Support for TSL Hooks - Automatic Hot Module Replacement for WebGPU TSL hooks - Canvas detects Vite/webpack HMR events and rebuilds nodes/uniforms - New hmr prop on Canvas, rebuildNodes(), rebuildUniforms() utils Bug Fixes - Fixed useNodes() and useUniforms() reader modes not updating when store changes - Fixed usePostProcessing callbacks not re-running after HMR - Fixed absolute Windows paths in bundled type declarations (FiberRoot now defined locally) - Fixed eslint-plugin codegen not awaiting prettier format Maintenance - Migrated to ESLint 9 flat config - Updated Vite to v7, Prettier to v3, Husky to v9, lint-staged to v16 - Converted verify-bundles.js to ES modules ---
- Updated dependencies [1692803]
  - @react-three/fiber@10.0.0-alpha.2

## 0.0.1-alpha.0

### Patch Changes

- Updated dependencies
  - @react-three/fiber@10.0.0-alpha.1

## 1.1.0

### Minor Changes

- 85c80e70: eventsource and eventprefix on the canvas component

## 1.0.0

### Major Changes

- 385ba9c: v8 major, react-18 compat
- 04c07b8: v8 major, react-18 compat

## 1.0.0-beta.0

### Major Changes

- 385ba9c: v8 major, react-18 compat
