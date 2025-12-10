# R3F Three.js Import Migration Guide

## Status: ✅ COMPLETE

All files have been converted from scattered `three` / `three/webgpu` imports to the centralized `#three` re-export system.

---

## Summary of Changes

### 1. Created `src/three/` Re-export Module

| File        | Purpose                             | Flags                       |
| ----------- | ----------------------------------- | --------------------------- |
| `index.ts`  | Default (WebGPU + deprecated WebGL) | `LEGACY=true, WEBGPU=true`  |
| `legacy.ts` | WebGL only                          | `LEGACY=true, WEBGPU=false` |
| `webgpu.ts` | WebGPU only                         | `LEGACY=false, WEBGPU=true` |
| `tsl.ts`    | TSL re-exports                      | -                           |

### 2. Created `types/` Type Definitions

All types have been migrated from inline definitions in source files to centralized `.d.ts` files:

| File                    | Types                                                                 |
| ----------------------- | --------------------------------------------------------------------- |
| `types/index.ts`        | Barrel export for all types                                           |
| `types/store.d.ts`      | RootState, RootStore, Size, Viewport, Performance, Subscription, etc. |
| `types/events.d.ts`     | Intersection, ThreeEvent, DomEvent, EventHandlers, EventManager, etc. |
| `types/renderer.d.ts`   | Renderer, GLProps, RendererProps, RenderProps, ReconcilerRoot, etc.   |
| `types/reconciler.d.ts` | Instance, Catalogue, Args, InstanceProps, HostConfig, etc.            |
| `types/loop.d.ts`       | GlobalRenderCallback, GlobalEffectType                                |
| `types/utils.d.ts`      | Properties, ThreeCamera, ObjectMap, EquConfig, Disposable, etc.       |
| `types/canvas.d.ts`     | CanvasProps                                                           |
| `types/loader.d.ts`     | LoaderLike, LoaderResult, Extensions, InputLike                       |
| `types/webgl.d.ts`      | WebGL-specific types                                                  |
| `types/webgpu.d.ts`     | WebGPU-specific types                                                 |

### 3. Build Flags

Each build variant exports:

```typescript
export const R3F_BUILD_LEGACY = true | false
export const R3F_BUILD_WEBGPU = true | false
```

These flags:

- Enable build-path detection at runtime
- Allow tree-shaking of dead code branches
- Are re-exported from entry points for consumer use

### 4. Updated TypeScript Config

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "#three": ["packages/fiber/src/three/index.ts"],
      "#three/*": ["packages/fiber/src/three/*"],
      "#types": ["packages/fiber/types/index.ts"],
      "#types/*": ["packages/fiber/types/*"]
    }
  }
}
```

### 5. Updated Babel Config

```javascript
// babel.config.js
plugins: [
  ['module-resolver', {
    alias: {
      '#three': './packages/fiber/src/three/index.ts',
      '#three/legacy': './packages/fiber/src/three/legacy.ts',
      '#three/webgpu': './packages/fiber/src/three/webgpu.ts',
      '#three/tsl': './packages/fiber/src/three/tsl.ts',
    },
  }],
],
```

### 6. New Entry Points

| Entry              | Import Path                 | Description              |
| ------------------ | --------------------------- | ------------------------ |
| `index.tsx`        | `@react-three/fiber`        | Default (both renderers) |
| `native.tsx`       | `@react-three/fiber/native` | React Native             |
| `legacy.tsx`       | `@react-three/fiber/legacy` | WebGL only               |
| `webgpu/index.tsx` | `@react-three/fiber/webgpu` | WebGPU only + TSL hooks  |

### 7. Updated Preconstruct Config

```json
// packages/fiber/package.json
{
  "preconstruct": {
    "entrypoints": ["index.tsx", "native.tsx", "legacy.tsx", "webgpu/index.tsx"]
  }
}
```

---

## Converted Files

| File                           | Status | Notes                       |
| ------------------------------ | ------ | --------------------------- |
| `core/index.tsx`               | ✅     | Simplified barrel exports   |
| `core/renderer.tsx`            | ✅     | Build flag validation added |
| `core/utils.tsx`               | ✅     | Types moved to #types       |
| `core/store.ts`                | ✅     | Types moved to #types       |
| `core/events.ts`               | ✅     | Types moved to #types       |
| `core/reconciler.tsx`          | ✅     | Types moved to #types       |
| `core/loop.ts`                 | ✅     | Types moved to #types       |
| `core/Canvas.tsx`              | ✅     | Types moved to #types       |
| `core/hooks/index.tsx`         | ✅     | Types moved to #types       |
| `core/hooks/useFrame.tsx`      | ✅     | Types moved to #types       |
| `core/hooks/useLoader.tsx`     | ✅     | Types moved to #types       |
| `webgpu/hooks/useUniforms.tsx` | ✅     | Types moved to #types       |
| `webgpu/hooks/useNodes.tsx`    | ✅     | Types moved to #types       |
| `three-types.ts`               | ✅     | Types moved to #types       |

---

## How It Works

### Three.js Import Pattern

```typescript
// Before (scattered imports)
import { WebGLRenderer } from 'three'
import { WebGPURenderer } from 'three/webgpu'
import * as THREE from 'three/webgpu'

// After (centralized)
import * as THREE from '#three'
import { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU, WebGLRenderer, WebGPURenderer } from '#three'
```

### Type Import Pattern

```typescript
// Before (relative paths that vary by depth)
import type { RootState } from '../../types'
import type { RootState } from '../../../types'

// After (consistent alias)
import type { RootState, RootStore, Instance } from '#types'
```

### Core Index Exports

```typescript
// core/index.tsx - Clean barrel exports
export type * from '#types'

export * from './events'
export * from './hooks'
export * from './loop'
export * from './reconciler'
export * from './renderer'
export * from './store'
export * from './utils'
```

### Runtime Behavior

```typescript
// Build flag validation
if (glConfig && !R3F_BUILD_LEGACY) {
  throw new Error('WebGLRenderer not available in this build')
}

// Code paths guarded by flags
if (R3F_BUILD_LEGACY && wantsGL) {
  // WebGL path - tree-shaken in webgpu-only builds
}
if (R3F_BUILD_WEBGPU && !wantsGL) {
  // WebGPU path - tree-shaken in legacy-only builds
}
```

### Consumer Usage

```typescript
// Check build flags
import { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU } from '@react-three/fiber'

if (R3F_BUILD_WEBGPU) {
  // WebGPU features available
}

// All types available from main import
import type { RootState, Instance, ThreeEvent } from '@react-three/fiber'
```

---

## Next Steps

1. **Run `yarn install`** to install `babel-plugin-module-resolver`
2. **Run `yarn build`** to test the new entry points
3. **Test each import path**:
   - `@react-three/fiber` (default)
   - `@react-three/fiber/legacy`
   - `@react-three/fiber/webgpu`
   - `@react-three/fiber/native`

---

## Future Optimizations

For true per-build bundle optimization (completely separate code paths):

1. Configure per-entry-point babel aliases
2. Or use Rollup's `@rollup/plugin-alias` with conditional config
3. Or create separate source trees per build target

Current approach relies on tree-shaking based on constant boolean flags, which should eliminate dead code in production builds.

---

## Related: Native Package Split

React Native support has been moved to a separate `@react-three/native` package.
See `NATIVE-MIGRATION.md` for details.
