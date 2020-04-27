[![Build Status](https://travis-ci.org/react-spring/drei.svg?branch=master)](https://travis-ci.org/react-spring/drei) [![npm version](https://badge.fury.io/js/drei.svg)](https://badge.fury.io/js/drei) ![npm](https://img.shields.io/npm/dt/drei.svg)

This is a growing collection of useful helpers and abstractions for [react-three-fiber](https://github.com/react-spring/react-three-fiber), saving you some boilerplate.

    yarn add drei

```jsx
import { ... } from 'drei'
```

## Exports

#### Controls

All controls have damping enabled by default, they manage their own updates, remove themselves on unmount, are compatible with the `invalidateFrameloop` canvas-flag.

- [x] `<OrbitControls />`
- [x] `<MapControls />`
- [x] `<TrackballControls />`
- [x] `<TransformControls />` | [sandbox](https://codesandbox.io/s/r3f-drei-transformcontrols-hc8gm)

```jsx
<TransformControls>
  <mesh />
</TransformControls>
```

#### Abstractions

- [x] `<Detailed />`, a wrapper around THREE.LOD (Level of detail) | [sandbox](https://codesandbox.io/s/r3f-drei-detailed-dep1v)

```jsx
<Detailed distances={[0, 10, 20]}>
  <mesh />
  <mesh />
  <mesh />
</Detailed>
```

- [x] `<PositionalAudio />`, a wrapper around THREE.PositionalAudio | [sandbox](https://codesandbox.io/s/r3f-drei-positionalaudio-yi1o0)

```jsx
<mesh>
  <PositionalAudo url="/song.mp3" />
</mesh>
```

#### Misc

- [x] `draco(url = "/draco-gtltf/")`, adds Draco extension to GLTFLoader

```jsx
useLoader(GLTFLoader, url, draco())
```

## Contributions

If you find yourself repeating set-up code often and if it's generic enough, add it here, everyone benefits!

#### Requirements

- Types
- ForwardRefs if possible, so that objects can be referenced back
- Invalidate frames on any movement for those using invalidateFrameloop
- Cleanup on unmount, no left-overs, restore previous states
