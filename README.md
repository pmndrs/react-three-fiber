[![Build Status](https://travis-ci.org/react-spring/drei.svg?branch=master)](https://travis-ci.org/react-spring/drei) [![npm version](https://badge.fury.io/js/drei.svg)](https://badge.fury.io/js/drei) ![npm](https://img.shields.io/npm/dt/drei.svg)

<p align="center">
    <img width="500" src="https://imgur.com/WVLtwnn.jpg" alt="logo" />
</p>

A growing collection of useful helpers and abstractions for [react-three-fiber](https://github.com/react-spring/react-three-fiber), saving you some boilerplate.

    yarn add drei

```jsx
import { ... } from 'drei'
```

## Exports

#### Cameras

- [x] PerspectiveCamera `makeDefault=true`, can take children (which are then moved w/ the cam)

```jsx
<PerspectiveCamera>
  <mesh />
</PerspectiveCamera>
```

#### Controls

All controls have damping enabled by default, they manage their own updates, remove themselves on unmount, are compatible with the `invalidateFrameloop` canvas-flag.

- [x] OrbitControls `enableDamping=true` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-contact-shadow-h5xcw)
- [x] MapControls `enableDamping=true` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-three-fiber-map-mkq8e)
- [x] TrackballControls
- [x] TransformControls [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-transformcontrols-hc8gm)

```jsx
<TransformControls>
  <mesh />
</TransformControls>
```

#### Abstractions

- [x] Detailed [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-detailed-dep1v)

A wrapper around THREE.LOD (Level of detail)

```jsx
<Detailed distances={[0, 10, 20]}>
  <mesh />
  <mesh />
  <mesh />
</Detailed>
```

- [x] PositionalAudio `distance=1` `loop=true` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-positionalaudio-yi1o0) ![](https://img.shields.io/badge/-suspense-brightgreen)

A wrapper around THREE.PositionalAudio.

```jsx
<mesh>
  <PositionalAudo url="/song.mp3" />
</mesh>
```

#### Misc

- [x] draco(`url = '/draco-gtltf/'`) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-contact-shadow-h5xcw)

Adds the Draco extension to your GLTFLoader.

```jsx
useLoader(GLTFLoader, url, draco())
```

- [x] StandardEffects `ao=true|{...}` `bloom=true|{...}` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-standardeffects-frcmm) ![](https://img.shields.io/badge/-suspense-brightgreen)

Adds [ambient-occlusion](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SSAOEffect.js~SSAOEffect.html#instance-constructor-constructor), [bloom](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/BloomEffect.js~BloomEffect.html#instance-constructor-constructor) and SMAA using the [postprocessing](https://github.com/vanruesc/postprocessing) library.

```jsx
<StandardEffects />
```

## Contributions

If you find yourself repeating set-up code often and if it's generic enough, add it here, everyone benefits!

#### Requirements

- Types
- ForwardRefs if possible, so that objects can be referenced back
- Invalidate frames on any movement for those using invalidateFrameloop
- Cleanup on unmount, no left-overs, restore previous states
