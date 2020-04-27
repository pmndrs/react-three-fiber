[![Build Status](https://travis-ci.org/react-spring/drei.svg?branch=master)](https://travis-ci.org/react-spring/drei) [![npm version](https://badge.fury.io/js/drei.svg)](https://badge.fury.io/js/drei) ![npm](https://img.shields.io/npm/dt/drei.svg)

This is a collection of useful helpers and abstractions for [react-three-fiber](https://github.com/react-spring/react-three-fiber), saving you some boilerplate.

<br />

    yarn add drei

```jsx
import { ... } from 'drei'
```

<br />

### Exports

- [x] OrbitControls, `<OrbitControls enableDamping ... />`
- [x] MapControls, `<MapControls enableDamping ... />`
- [x] TrackballControls, `<TrackballControls ... />`
- [x] TransformControls, `<TransformControls ... >{child}</TransformControls>`
- [x] draco, `useLoader(GLTFLoader, url, draco())`

### Contributions

**PR's are more than welcome!** If you find yourself repeating set-up code often and if it's generic enough to be useful, add it here, everyone benefits.

### Requirements

- Types
- ForwardRefs if possible, so that objects can be referenced
- Cleanup on unmount, no left-overs
