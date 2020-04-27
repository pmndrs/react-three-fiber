[![Build Status](https://travis-ci.org/react-spring/drei.svg?branch=master)](https://travis-ci.org/react-spring/drei) [![npm version](https://badge.fury.io/js/drei.svg)](https://badge.fury.io/js/drei) ![npm](https://img.shields.io/npm/dt/drei.svg)

This is a growing collection of useful helpers and abstractions for [react-three-fiber](https://github.com/react-spring/react-three-fiber), saving you some boilerplate.

    yarn add drei

```jsx
import { ... } from 'drei'
```

## Exports

#### Controls

- [x] `<OrbitControls />`, `<OrbitControls enableDamping ... />`
- [x] `<MapControls />`, `<MapControls enableDamping ... />`
- [x] `<TrackballControls />`, `<TrackballControls ... />`
- [x] `<TransformControls />`

```jsx
<TransformControls>
  <mesh />
</TransformControls>
```

#### Abstractions

- [x] `<Detailed />`, a wrapper around THREE.LOD (Level of detail)

```jsx
<Detailed distances={[0, 10, 20]}>
  <mesh />
  <mesh />
  <mesh />
</Detailed>
```

- [x] `<PositionalAudo />`, a wrapper around THREE.PositionalAudio

```jsx
<mesh>
  <PositionalAudo url="/song.mp3" />
</mesh>
```

#### Misc

- [x] `draco(url = "/draco-gtltf/")`, `useLoader(GLTFLoader, url, draco())`

## Contributions

If you find yourself repeating set-up code often and if it's generic enough, add it here, everyone benefits!

#### Requirements

- Types
- ForwardRefs if possible, so that objects can be referenced back
- Invalidate frames on any movement for those using invalidateFrameloop
- Cleanup on unmount, no left-overs, restore previous states
