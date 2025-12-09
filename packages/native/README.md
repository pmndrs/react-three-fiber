# @react-three/native

React Native bindings for [@react-three/fiber](https://github.com/pmndrs/react-three-fiber).

## Installation

```bash
# Install core fiber and native packages
npm install @react-three/fiber @react-three/native three

# Install expo dependencies
npx expo install expo-gl expo-asset expo-file-system
```

## Usage

```tsx
import { Canvas } from '@react-three/native'

function App() {
  return (
    <Canvas>
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="orange" />
      </mesh>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
    </Canvas>
  )
}
```

## Migration from v9

In v10, React Native support has been moved to a separate package for cleaner dependency management.

### Before (v9)

```bash
npm install @react-three/fiber three
```

```tsx
import { Canvas } from '@react-three/fiber/native'
```

### After (v10)

```bash
npm install @react-three/fiber @react-three/native three
npx expo install expo-gl expo-asset expo-file-system
```

```tsx
import { Canvas } from '@react-three/native'
```

## API

### Canvas

The native Canvas component accepts all the same props as the web Canvas, with some native-specific behavior:

- Uses `expo-gl` for GL context by default
- Automatically applies native DPR via `PixelRatio.get()`
- Touch events are translated to pointer events via PanResponder

```tsx
import { Canvas } from '@react-three/native'

;<Canvas camera={{ position: [0, 0, 5] }} onCreated={(state) => console.log('Canvas ready!')}>
  {/* Your 3D scene */}
</Canvas>
```

### Polyfills

Polyfills are automatically applied on import. They patch:

- `THREE.TextureLoader` - Uses expo-asset for texture loading
- `THREE.FileLoader` - Uses expo-file-system for file loading
- `URL.createObjectURL` - Blob handling for React Native
- `THREE.LoaderUtils` - URL base extraction

If you need to control when polyfills are applied:

```tsx
// Import without auto-polyfills
import { Canvas } from '@react-three/native/Canvas'
import { polyfills } from '@react-three/native/polyfills'

// Apply manually
polyfills()
```

### Custom GL Context (Advanced)

For future WebGPU support or custom GL implementations:

```tsx
import { Canvas, GLContextProvider } from '@react-three/native'
import { CustomGLView } from 'some-gl-library'

;<GLContextProvider
  value={{
    GLView: CustomGLView,
    contextType: 'webgl', // or 'webgpu'
  }}>
  <Canvas>{/* Your scene */}</Canvas>
</GLContextProvider>
```

## Requirements

- React Native >= 0.78
- Expo SDK >= 43
- React >= 19

## Features

Everything from `@react-three/fiber` works, plus:

- Touch event handling (tap, pan, pinch)
- Asset loading via expo-asset
- Texture loading with proper RN image handling
- Automatic polyfills for Three.js loaders

## Troubleshooting

### "expo-gl not found"

Make sure you've installed expo-gl:

```bash
npx expo install expo-gl
```

### Textures not loading

Ensure expo-asset and expo-file-system are installed:

```bash
npx expo install expo-asset expo-file-system
```

### TypeScript errors

Make sure you have the correct types:

```bash
npm install -D @types/three @types/react-native
```

## License

MIT
