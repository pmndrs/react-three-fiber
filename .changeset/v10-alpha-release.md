---
'@react-three/fiber': major
'@react-three/test-renderer': major
'@react-three/eslint-plugin': minor
---

## R3F v10 - WebGPU Support & React 19

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
