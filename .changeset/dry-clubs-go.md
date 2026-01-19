---
'@react-three/eslint-plugin': major
'@react-three/test-renderer': major
'@react-three/fiber': major
'example': patch
---

Features Canvas Size Control - Added width and height props to Canvas for explicit resolution control - Enhanced setSize() API with square shorthand and reset capability - Ownership model: imperative setSize(w, h) takes control until setSize() resets ScopedStore for Type-Safe Uniform/Node Access - New createScopedStore<T>() wrapper for TypeScript-friendly access to uniforms/nodes - Eliminates manual casting in creator functions - New exports: ScopedStoreType<T>, CreatorState HMR Support for TSL Hooks - Automatic Hot Module Replacement for WebGPU TSL hooks - Canvas detects Vite/webpack HMR events and rebuilds nodes/uniforms - New hmr prop on Canvas, rebuildNodes(), rebuildUniforms() utils Bug Fixes - Fixed useNodes() and useUniforms() reader modes not updating when store changes - Fixed usePostProcessing callbacks not re-running after HMR - Fixed absolute Windows paths in bundled type declarations (FiberRoot now defined locally) - Fixed eslint-plugin codegen not awaiting prettier format Maintenance - Migrated to ESLint 9 flat config - Updated Vite to v7, Prettier to v3, Husky to v9, lint-staged to v16 - Converted verify-bundles.js to ES modules ---
