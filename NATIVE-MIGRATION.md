# Native Package Migration (v10)

## Summary

In v10, React Native support has been extracted from `@react-three/fiber` into a separate `@react-three/native` package.

---

## Why the Split?

1. **Cleaner dependencies** - Web users no longer see expo/RN peer dependencies
2. **Smaller installs** - No native-specific deps like `base64-js` and `buffer` in web builds
3. **Better separation** - Native-specific code lives in its own package
4. **Future-proof** - Enables pluggable GL context for react-native-webgpu

---

## Decisions Made

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

## What Changed

### Package Structure

```
Before (v9):
packages/
└── fiber/
    ├── src/native/          # Native source
    ├── native.tsx           # Native entry point
    └── package.json         # Had all deps

After (v10):
packages/
├── fiber/                   # Web-focused
│   └── package.json         # Clean web deps only
└── native/                  # NEW: Native-focused
    ├── src/
    │   ├── index.tsx
    │   ├── Canvas.tsx
    │   ├── context.tsx      # Pluggable GL
    │   ├── polyfills.ts
    │   └── events.ts
    ├── __mocks__/
    ├── tests/
    └── package.json         # Native deps here
```

### Dependencies Moved

From `@react-three/fiber` to `@react-three/native`:

**Peer Dependencies:**

- `expo`
- `expo-asset`
- `expo-file-system`
- `expo-gl`
- `react-native`

**Dependencies:**

- `base64-js`
- `buffer`

### Import Changes

```tsx
// Before (v9)
import { Canvas } from '@react-three/fiber/native'

// After (v10)
import { Canvas } from '@react-three/native'
```

### Installation Changes

```bash
# Before (v9)
npm install @react-three/fiber three

# After (v10) - Web
npm install @react-three/fiber three

# After (v10) - React Native
npm install @react-three/fiber @react-three/native three
npx expo install expo-gl expo-asset expo-file-system
```

---

## Package Configurations

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
  },
  "peerDependenciesMeta": {
    "react-dom": { "optional": true }
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
    "@react-three/fiber": "^10.0.0",
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

## Technical Details

### What Native Canvas Needs from Core

```typescript
// From @react-three/fiber
import {
  extend,
  createRoot,
  unmountComponentAtNode,
  createPointerEvents,
  Block,
  ErrorBoundary,
  useMutableCallback,
  useBridge,
  useIsomorphicLayoutEffect,
} from '@react-three/fiber'

import type { RenderProps, ReconcilerRoot, RootState, Size } from '@react-three/fiber'
```

**Key Insight:** Native Canvas uses `createPointerEvents` from web - this works because it just creates event handlers, the actual events come from PanResponder.

### Files Moved

```
FROM: packages/fiber/
TO: packages/native/

├── src/native/Canvas.tsx      → src/Canvas.tsx
├── src/native/events.ts       → src/events.ts
├── src/native/polyfills.ts    → src/polyfills.ts
├── src/native.tsx             → src/index.tsx (modified)
├── __mocks__/expo-*.ts        → __mocks__/
├── __mocks__/react-native.ts  → __mocks__/
└── tests/canvas.native.test.tsx → tests/
```

---

## New Features

### Pluggable GL Context

Prepare for future react-native-webgpu support:

```tsx
import { Canvas, GLContextProvider } from '@react-three/native'

// Default uses expo-gl
<Canvas>...</Canvas>

// Custom GL provider (future)
<GLContextProvider value={{ GLView: WebGPUView, contextType: 'webgpu' }}>
  <Canvas>...</Canvas>
</GLContextProvider>
```

### Explicit Polyfill Control

```tsx
// Auto-polyfills on import (default)
import { Canvas } from '@react-three/native'

// Manual control
import { Canvas } from '@react-three/native/Canvas'
import { polyfills } from '@react-three/native/polyfills'
polyfills()
```

---

## Version Alignment

`@react-three/native` versions are coupled with `@react-three/fiber`:

| fiber  | native |
| ------ | ------ |
| 10.0.0 | 10.0.0 |
| 10.1.0 | 10.1.0 |
| ...    | ...    |

---

## Breaking Changes

1. **Import path changed** - `@react-three/fiber/native` → `@react-three/native`
2. **Separate package required** - Must install `@react-three/native` for RN support
3. **No deprecation period** - This is a major version (v10), hard break

---

## Upgrade Checklist

- [ ] Install `@react-three/native` package
- [ ] Update imports from `@react-three/fiber/native` to `@react-three/native`
- [ ] Ensure expo dependencies are installed (`expo-gl`, `expo-asset`, `expo-file-system`)
- [ ] Test your app

---

## Implementation Status

| Phase          | Status | Notes                      |
| -------------- | ------ | -------------------------- |
| Package setup  | ✅     | Package scaffolding        |
| Code migration | ✅     | Files moved, imports fixed |
| Fiber cleanup  | ✅     | Native deps removed        |
| Documentation  | ✅     | This guide                 |
