# Plan: Split Native into Separate Package

## Overview

Create a new `@react-three/native` package to cleanly separate React Native dependencies from the core `@react-three/fiber` package.

**Target Release:** v10.0.0 (Major Version)

---

## Decisions Made ✅

| Question         | Decision                                                       |
| ---------------- | -------------------------------------------------------------- |
| Package name     | `@react-three/native`                                          |
| Version strategy | Same version as fiber (coupled releases)                       |
| Migration path   | Hard break (v10 is major, no deprecation)                      |
| Release timing   | v10 major release                                              |
| WebGPU native    | Pluggable architecture, default expo-gl                        |
| XR native        | Under `@react-three/native/xr` if needed, no expo deps in core |
| Shared code      | Re-export from fiber (native depends on fiber)                 |

---

## Technical Analysis

### What Native Canvas Needs from Core

```typescript
// From core/index.tsx
import { extend, createRoot, unmountComponentAtNode, RenderProps, ReconcilerRoot } from '@react-three/fiber'

// From core/utils.tsx
import {
  SetBlock,
  Block,
  ErrorBoundary,
  useMutableCallback,
  useBridge,
  useIsomorphicLayoutEffect,
} from '@react-three/fiber'

// From core/store.ts
import { RootState, Size } from '@react-three/fiber'

// From web/events.ts (interesting!)
import { createPointerEvents } from '@react-three/fiber'
```

**Key Insight:** Native Canvas uses `createPointerEvents` from web - this works because it just creates event handlers, the actual events come from PanResponder.

### Native-Specific Dependencies

**Move to `@react-three/native`:**

```json
{
  "dependencies": {
    "base64-js": "^1.5.1",
    "buffer": "^6.0.3"
  },
  "peerDependencies": {
    "@react-three/fiber": "^9.0.0",
    "expo": ">=43.0",
    "expo-asset": ">=8.4",
    "expo-file-system": ">=11.0",
    "expo-gl": ">=11.0",
    "react": "^19.0.0",
    "react-native": ">=0.78",
    "three": ">=0.156"
  }
}
```

**Keep in `@react-three/fiber`:**

```json
{
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": ">=0.156"
  },
  "peerDependenciesMeta": {
    "react-dom": { "optional": true }
  }
}
```

### Files to Move

```
FROM: packages/fiber/
TO: packages/native/

Move:
├── src/native/Canvas.tsx      → src/Canvas.tsx
├── src/native/events.ts       → src/events.ts
├── src/native/polyfills.ts    → src/polyfills.ts
├── src/native.tsx             → src/index.tsx (modified)
├── __mocks__/expo-*.ts        → __mocks__/
├── __mocks__/react-native.ts  → __mocks__/
├── tests/canvas.native.test.tsx → tests/
└── tests/__snapshots__/canvas.native.test.tsx.snap → tests/__snapshots__/
```

### Import Updates in Native Package

```typescript
// Before (in fiber)
import { extend, createRoot } from '../core'
import { createPointerEvents } from '../web/events'

// After (in native package)
import { extend, createRoot, createPointerEvents } from '@react-three/fiber'
```

---

## Implementation Status

### ✅ Phase 1: Setup - COMPLETE

1. **Create `packages/native/` structure**

   ```
   packages/native/
   ├── package.json
   ├── tsconfig.json
   ├── src/
   │   ├── index.tsx
   │   ├── Canvas.tsx
   │   ├── events.ts
   │   └── polyfills.ts
   ├── __mocks__/
   └── tests/
   ```

2. **Configure package.json**

   - Name: `@react-three/native`
   - Peer dep on `@react-three/fiber`
   - All expo/RN deps moved here

3. **Update root workspace**

   - Add to `workspaces` array
   - Add to preconstruct packages

4. **Export needed internals from fiber**
   - Ensure `createPointerEvents` is exported
   - Ensure utility functions are exported
   - May need to add some exports to fiber's public API

### ✅ Phase 2: Migration - COMPLETE

5. **Copy and adapt files** ✅

   - Move native source files
   - Update imports to use `@react-three/fiber`
   - Update `#three` paths

6. **Move tests and mocks**

   - Native-specific test files
   - expo/RN mock files

7. **Update fiber package**
   - Remove native peer deps
   - Remove `base64-js`, `buffer` from deps
   - Keep `/native` entry point for deprecation period

### ✅ Phase 3: Hard Break (v10) - COMPLETE

8. **Removed `/native` entry point from fiber**

   ```typescript
   // packages/fiber/src/native.tsx
   console.warn(
     '[@react-three/fiber] Importing from "@react-three/fiber/native" is deprecated. ' +
       'Please install @react-three/native and import from there instead.',
   )
   export * from '@react-three/native' // Re-export
   ```

9. **Update documentation**
   - New install instructions
   - Migration guide
   - README updates

### Phase 4: Cleanup (Major Version)

10. **In next major version (v10?)**
    - Remove `/native` entry point from fiber
    - Remove deprecation re-exports
    - Clean final state

---

## Package Structure (Final)

### `@react-three/fiber` (cleaned)

```json
{
  "name": "@react-three/fiber",
  "exports": {
    ".": "./dist/index.js",
    "./legacy": "./dist/legacy.js",
    "./webgpu": "./dist/webgpu.js"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "three": ">=0.156"
  }
}
```

### `@react-three/native` (new)

```json
{
  "name": "@react-three/native",
  "exports": {
    ".": "./dist/index.js"
  },
  "peerDependencies": {
    "@react-three/fiber": "^9.0.0",
    "expo": ">=43.0",
    "expo-asset": ">=8.4",
    "expo-file-system": ">=11.0",
    "expo-gl": ">=11.0",
    "react": "^19.0.0",
    "react-native": ">=0.78",
    "three": ">=0.156"
  },
  "dependencies": {
    "base64-js": "^1.5.1",
    "buffer": "^6.0.3"
  }
}
```

---

## User Experience

### Before (Current)

```bash
# Install (web or native, same package)
npm install @react-three/fiber three

# Web usage
import { Canvas } from '@react-three/fiber'

# Native usage
import { Canvas } from '@react-three/fiber/native'
```

### After (Proposed)

```bash
# Web only
npm install @react-three/fiber three

# React Native
npm install @react-three/fiber @react-three/native three expo-gl
```

```typescript
// Web usage (unchanged)
import { Canvas } from '@react-three/fiber'

// Native usage (new import)
import { Canvas } from '@react-three/native'
```

---

## Risks & Mitigations

| Risk                           | Mitigation                                  |
| ------------------------------ | ------------------------------------------- |
| Breaking existing native apps  | Deprecation period with re-exports          |
| Version drift between packages | Coupled releases, shared changelog          |
| Missing exports from fiber     | Audit needed exports before split           |
| Test coverage gaps             | Move tests with code, add integration tests |
| Documentation confusion        | Clear migration guide, update all docs      |

---

## Timeline Estimate

| Phase                | Effort    | Notes                      |
| -------------------- | --------- | -------------------------- |
| Phase 1: Setup       | 2-3 hours | Package scaffolding        |
| Phase 2: Migration   | 4-6 hours | Code moves, import updates |
| Phase 3: Deprecation | 1-2 hours | Warnings, docs             |
| Phase 4: Cleanup     | 1 hour    | Future major version       |

**Total: ~8-12 hours of focused work**

---

## Questions for Discussion

1. **Version coupling:** Same version numbers or independent?
2. **Deprecation period:** How long before removing `/native` entry?
3. **WebGPU native:** Plan for `react-native-webgpu` support?
4. **Package naming:** `@react-three/native` ok?
5. **Release timing:** Part of v9.x or wait for v10?
6. **XR consideration:** Similar split for XR native?

---

## Next Steps

Once questions are resolved:

1. Create the package structure
2. Move files and update imports
3. Test both packages work together
4. Add deprecation warnings
5. Update documentation
6. Publish new package
