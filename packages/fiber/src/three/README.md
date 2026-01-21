# Internal Three.js Re-exports

This directory is the **single source of truth** for Three.js imports within R3F.

## Why?

Three.js now has two import paths:

- `three` - Core + WebGL
- `three/webgpu` - Core + WebGPU (superset)

Instead of scattering imports throughout the codebase and using build-time comment block swapping, we centralize here.

## Files

| File        | Purpose                             | Used By                          |
| ----------- | ----------------------------------- | -------------------------------- |
| `index.ts`  | Default (WebGPU + deprecated WebGL) | Root `@react-three/fiber` import |
| `legacy.ts` | WebGL only                          | `@react-three/fiber/legacy`      |
| `webgpu.ts` | WebGPU only (no legacy)             | `@react-three/fiber/webgpu`      |
| `tsl.ts`    | TSL convenience exports             | WebGPU builds                    |

## Usage in R3F Code

All internal code should import from `#three`:

```typescript
// Simple namespace import
import * as THREE from '#three'

// Named imports
import { WebGPURenderer, Inspector, type WebGLShadowMap } from '#three'

// TSL imports (webgpu only)
import { uniform, vec3, Fn } from '#three/tsl'
```

## TypeScript Configuration

The `#three` alias is configured in the root `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "#three": ["packages/fiber/src/three/index.ts"],
      "#three/*": ["packages/fiber/src/three/*"]
    }
  }
}
```
