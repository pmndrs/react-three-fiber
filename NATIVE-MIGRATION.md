# Native Package Migration (v10)

## Summary

In v10, React Native support has been extracted from `@react-three/fiber` into a separate `@react-three/native` package.

## Why?

1. **Cleaner dependencies** - Web users no longer see expo/RN peer dependencies
2. **Smaller installs** - No native-specific deps like `base64-js` and `buffer` in web builds
3. **Better separation** - Native-specific code lives in its own package
4. **Future-proof** - Enables pluggable GL context for react-native-webgpu

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
    │   ├── Canvas.tsx
    │   ├── context.tsx      # Pluggable GL
    │   ├── polyfills.ts
    │   └── events.ts
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

## Files Changed

### Created (`packages/native/`)

- `package.json` - Native-specific dependencies
- `src/index.tsx` - Entry point
- `src/Canvas.tsx` - Native Canvas with pluggable GL
- `src/context.tsx` - GLContextProvider for GL swapping
- `src/polyfills.ts` - Three.js RN polyfills
- `src/events.ts` - Touch event handling
- `__mocks__/` - Test mocks for expo/RN
- `tests/` - Native-specific tests
- `README.md` - Package documentation

### Modified (`packages/fiber/`)

- `package.json` - Removed native deps and entry point
- `src/index.tsx` - Added `createPointerEvents` export
- `src/core/index.tsx` - Added utility exports for native

### Deleted (from `packages/fiber/`)

- `src/native/` - Moved to native package
- `src/native.tsx` - Entry point moved
- `native/package.json` - Preconstruct entry removed
- `__mocks__/expo-*.ts` - Moved to native package
- `__mocks__/react-native.ts` - Moved to native package
- `tests/canvas.native.test.tsx` - Moved to native package

## Version Alignment

`@react-three/native` versions are coupled with `@react-three/fiber`:

| fiber  | native |
| ------ | ------ |
| 10.0.0 | 10.0.0 |
| 10.1.0 | 10.1.0 |
| ...    | ...    |

## Breaking Changes

1. **Import path changed** - `@react-three/fiber/native` → `@react-three/native`
2. **Separate package required** - Must install `@react-three/native` for RN support
3. **No deprecation period** - This is a major version (v10), hard break

## Checklist for Upgrading

- [ ] Install `@react-three/native` package
- [ ] Update imports from `@react-three/fiber/native` to `@react-three/native`
- [ ] Ensure expo dependencies are installed (`expo-gl`, `expo-asset`, `expo-file-system`)
- [ ] Test your app
