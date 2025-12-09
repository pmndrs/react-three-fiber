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

### 2. Build Flags

Each build variant exports:

```typescript
export const R3F_BUILD_LEGACY = true | false
export const R3F_BUILD_WEBGPU = true | false
```

These flags:

- Enable build-path detection at runtime
- Allow tree-shaking of dead code branches
- Are re-exported from entry points for consumer use

### 3. Updated TypeScript Config

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "#three": ["packages/fiber/src/three/index.ts"],
      "#three/*": ["packages/fiber/src/three/*"]
    }
  }
}
```

### 4. Updated Babel Config

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

### 5. New Entry Points

| Entry              | Import Path                 | Description              |
| ------------------ | --------------------------- | ------------------------ |
| `index.tsx`        | `@react-three/fiber`        | Default (both renderers) |
| `native.tsx`       | `@react-three/fiber/native` | React Native             |
| `legacy.tsx`       | `@react-three/fiber/legacy` | WebGL only               |
| `webgpu/index.tsx` | `@react-three/fiber/webgpu` | WebGPU only + TSL hooks  |

### 6. Updated Preconstruct Config

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

| File                       | Status | Notes                       |
| -------------------------- | ------ | --------------------------- |
| `core/renderer.tsx`        | ✅     | Build flag validation added |
| `core/utils.tsx`           | ✅     |                             |
| `core/store.ts`            | ✅     | Mixed imports consolidated  |
| `core/events.ts`           | ✅     |                             |
| `core/reconciler.tsx`      | ✅     | SwapBlock removed           |
| `core/hooks/useLoader.tsx` | ✅     |                             |
| `core/hooks/index.tsx`     | ✅     | SwapBlock removed           |
| `core/Canvas.tsx`          | ✅     |                             |
| `web/Canvas.tsx`           | ✅     |                             |
| `native/Canvas.tsx`        | ✅     |                             |
| `native/polyfills.ts`      | ✅     |                             |
| `three-types.ts`           | ✅     | SwapBlock removed           |

---

## How It Works

### Import Pattern (Before)

```typescript
//* WebGLBlock ===
import { WebGLRenderer } from 'three'
//* End WebGLBlock ===
//* WebGPUBlock ===
import { WebGPURenderer } from 'three/webgpu'
//* End WebGPUBlock ===
//* SwapBlock ===
import * as THREE from 'three/webgpu'
//* End SwapBlock ===
```

### Import Pattern (After)

```typescript
import * as THREE from '#three'
import { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU, WebGLRenderer, WebGPURenderer } from '#three'
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
