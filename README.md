[![Build Status](https://travis-ci.org/react-spring/drei.svg?branch=master)](https://travis-ci.org/react-spring/drei) [![npm version](https://badge.fury.io/js/drei.svg)](https://badge.fury.io/js/drei) ![npm](https://img.shields.io/npm/dt/drei.svg)

<p align="center">
    <img width="500" src="https://imgur.com/arDsXO6.jpg" alt="logo" />
</p>

A growing collection of useful helpers and abstractions for [react-three-fiber](https://github.com/react-spring/react-three-fiber), saving you some boilerplate.

If you find yourself repeating set-up code often and if it's generic enough, add it here, everyone benefits!

#### Requirements

- Types
- ForwardRefs if possible, so that objects can be referenced back
- Invalidate frames on any movement for those using invalidateFrameloop
- Cleanup on unmount, no left-overs, restore previous states

    yarn add drei

```jsx
import { ... } from 'drei'
```

# Exports

## Cameras

#### ⚡️ PerspectiveCamera `makeDefault=true`

A responsive, perspective camera that sets itself as the default. Can take children, which from then on move along.

```jsx
<PerspectiveCamera>
  <mesh />
</PerspectiveCamera>
```

## Controls

If available controls have damping enabled by default, they manage their own updates, remove themselves on unmount, are compatible with the `invalidateFrameloop` canvas-flag.

#### ⚡️ OrbitControls `enableDamping=true` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-contact-shadow-h5xcw)

#### ⚡️ MapControls `enableDamping=true` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-three-fiber-map-mkq8e)

#### ⚡️ TrackballControls

#### ⚡️ TransformControls [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-transformcontrols-hc8gm)

```jsx
<TransformControls>
  <mesh />
</TransformControls>
```

## Abstractions

#### ⚡️ Detailed [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-detailed-dep1v)

A wrapper around THREE.LOD (Level of detail). The number of distances corresponds to the direct children you add. Only one of the children will be shown according to how close the camera is to it.

```jsx
<Detailed distances={[0, 10, 20]}>
  <mesh geometry={highDetail} />
  <mesh geometry={mediumDetail} />
  <mesh geometry={lowDetail} />
</Detailed>
```

#### ⚡️ PositionalAudio `url` `distance=1` `loop=true` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-positionalaudio-yi1o0) ![](https://img.shields.io/badge/-suspense-brightgreen)

A wrapper around THREE.PositionalAudio. Add this to groups or meshes to tie them to a sound or a loop that plays when the camera comes near.

```jsx
<PositionalAudo url="/song.mp3" />
```

## Misc

#### ⚡️ draco(`url = '/draco-gtltf/'`) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-contact-shadow-h5xcw)

Adds the Draco extension to your GLTFLoader.

```jsx
useLoader(GLTFLoader, url, draco())
```

#### ⚡️ StandardEffects `ao=true|{...}` `bloom=true|{...}` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-standardeffects-frcmm) ![](https://img.shields.io/badge/-suspense-brightgreen)

Adds [ambient-occlusion](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SSAOEffect.js~SSAOEffect.html#instance-constructor-constructor), [bloom](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/BloomEffect.js~BloomEffect.html#instance-constructor-constructor) and SMAA using the [postprocessing](https://github.com/vanruesc/postprocessing) library.

## Shaders

#### ⚡️ Sky `distance=450000` `sunPosition=[0, 1, 0]` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-sky-3q4ev)

From: https://threejs.org/examples/webgl_shaders_sky.html
