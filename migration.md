# 2.x -> 3.x new features/migration guide

# Canvas

```jsx
<Canvas
  raycaster                     // Props that go into the default raycaster
  shadowMap                     // Props that go into gl.shadowMap, can also be set true for PCFsoft
  noEvents = false              // Switch off raytracing and event support
```

# Defaults that the canvas component sets up

A default _shadowMap_ if Canvas.shadowMap is true: `type: PCFSoftShadowMap`

# Events

#### Event data

```jsx
({
  ...DomEvent                   // All the original event data
  ...ThreeEvent                 // All of Three's intersection data
  object: Object3D              // The object that was actually hit
  eventObject: Object3D         // The object that registered the event
  unprojectedPoint: Vector3     // Camera-unprojected point
  ray: Ray                      // The ray that was used to strike the object
  sourceEvent: DomEvent         // A reference to the host event
  delta: number                 // Initial-click delta
}) => ...
```

# Hooks

#### useThree(): SharedCanvasContext

```jsx
const {
  mouse,                        // Current 2D mouse coordinates
  clock,                        // THREE.Clock (usefull for useFrame deltas)
} = useThree()
```

**[DEPRECATED]**: `useThree().canvas`. Replace by using `useThree().gl.domElement`.

#### useFrame(callback: (state, delta) => void, renderPriority: number = 0)

This hooks calls you back every frame, which is good for running effects, updating controls, etc. You receive the state (same as useThree) and a clock delta. If you supply a render priority greater than zero it will switch off automatic rendering entirely, you can then control rendering yourself. If you have multiple frames with a render priority then they are ordered highest priority last, similar to the web's z-index. Frames are managed, three-fiber will remove them automatically when the component that holds them is unmounted.

Updating controls:

```jsx
import { useFrame } from 'react-three-fiber'

const controls = useRef()
useFrame(state => controls.current.update())
return <orbitControls ref={controls} />
```

Taking over the render-loop:

```jsx
useFrame(({ gl, scene, camera }) => gl.render(scene, camera), 1)
```

#### useLoader(loader, url, [extensions]) (experimental!)

This hooks loads assets and suspends for easier fallback- and error-handling. It returns two values, the asset itself and a look-up-table of props. If you need to lay out GLTF's declaratively check out [gltfjsx](https://github.com/react-spring/gltfjsx).

```jsx
import React, { Suspense } from 'react'
import { useLoader } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

function Asset({ url }) {
  const [gltf] = useLoader(GLTFLoader, url, loader => {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco-gltf/')
    loader.setDRACOLoader(dracoLoader)
  })
  return <primitive object={gltf.scene} />
}

<Suspense fallback={<Cube />}>
  <Asset url="/spaceship.gltf" />
</Suspense>
```

# React Native OOTB support

You can leverage Expo's WebGL port to react-native and use react-three-fiber as the renderer.

```bash
expo init myapp
cd myapp
yarn add expo-gl expo-three three@latest react-three-fiber
yarn start
```

# GLTF to JSX

https://github.com/react-spring/gltfjsx

An experimental tool that turns GLTF's files into react-three-fiber-JSX components.

```bash
npx gltfjsx input.gltf [Output.js] [options]

Options:
  --draco, -d      adds DRACOLoader                   [string] [default: "/draco-gltf/"]
  --animation, -a  extracts animation clips           [boolean]
  --help           Show help                          [boolean]
  --version        Show version number                [boolean]
```

<img src="https://i.imgur.com/DmdTMcL.gif" />

# Misc

- Support for object.layers, [example](https://codesandbox.io/s/react-three-fiber-gltf-loader-animations-w633u)
- Finally compatible with [react-use-gesture](https://github.com/react-spring/react-use-gesture), [example](https://codesandbox.io/s/react-three-fiber-gestures-dh2jc)