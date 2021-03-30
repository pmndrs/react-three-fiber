# 6.0.0

### Monorepo

We've been moving our three-based eco system under the `@react-spring` namespace for a while now. This finally addds the core, `/fiber`. This is better for dicovery and semantic versioning.

```diff
--- npm install react-three-fiber
+++ npm install @react-three/fiber
```

### Features

- [x] Use r3f without react-dom (can save up to ~50kb)

https://twitter.com/0xca0a/status/1369635013424259075

```jsx
import React from 'react'
import { render } from 'react-three-fiber'

render(<mesh />, document.getElementById('canvas'), { shadows: true, ... })
```

- [x] Exchangeable renderer

```jsx
render(<mesh />, document.getElementById('canvas'), { gl: new SVGRenderer(), ... })
```

https://codesandbox.io/s/r3f-basic-demo-forked-zcuqh?file=/src/index.js


- [x] Optional/exchangeable event system

This could open up opportunities for event-system variants: pointer-events, pointer-lock, VR handheld, native, etc.

```jsx
import { events } from '@react-three/fiber'

render(<mesh />, document.getElementById('canvas'), { events, ... })
```

- [x] Moving to zustand for reactive internal state

Makes the entire state model observable, can prevent unnecessary re-render and improve performance.

```jsx
// Fetches everything, renders on every change to the state model, no breaking change ...
const state = useThree()
// Fetches specific parts, renders only when these change
const camera = useThree(state => state.camera)
```

- [x] Adaptive pixelratio to allow scaling down resolution on movement for expensive scenes etc

```jsx
// Since zustand drives state, pixelratio is now reactive
const pixelRatio = useThree(state => state.pixelRatio)
```

- [x] Opt in adaptive performance  

This is an opt in feature that makes it possible to create components that could be dropped into the scene to reduce visuals if the system is in regression, similar to what Sketchfab does (lower textures, fbo's etc on camera movement and so on). What counts as "regression" is up to the user to decide. In the drei library we will offer more and more pre-configured components that tap into this.

https://github.com/pmndrs/react-three-fiber/issues/1070

- [x] Object shortcuts (specifically objects that feature `setScalar`)

Less typing is always good. 😌

```jsx
<mesh position={0} scale={1} rotation={Math.PI} />
```

- [x] Clock control

Not only good for making looping gifs, also a wonderful tool to have for testing. Essentially this can make the entire application deterministic.

<Canvas frameloop='always' | 'demand' | 'never'

- `always`, game loop
- `demand`, on prop changes, invalide and a forced first render
- `never`, no invalidation

```jsx
import { advance } from 'react-three-fiber'

// Render a single frame, we can inject custom timestamps 
advance(Date.now())
```

- [x] Unit testing, snapshots, expecting scene outcome, act

Snapshot testing, unit testing, visual regression and integration testing, with comfortable tools insprired by react-testing-library.

https://github.com/pmndrs/react-three-fiber/tree/master/packages/test-renderer

- [x] Fix prop delete in HMR and otherwise

https://github.com/pmndrs/react-three-fiber/pull/996

### Removal of `useUpdate`

Instead, use:

```jsx
const ref = useRef()
useLayoutEffect(() => ref.currrent = ..., [condition])
```

or

```jsx
<mesh onUpdate={didUpdate} />
```

### Removal of `useResource`

Instead, use:

```jsx
const [material, set] = useState()
return (
  <>
    <meshBasicMaterial ref={material} />
    {material && <Foo material={material}>}
  </>
)
```

### Changed

- `pixelRatio` -> `dpr`
- `colorManagement={false}` -> `linear`
- `noEvents={true}` -> `state.raycaster.enabled = false`
- `shadowMap` -> `shadows`
- `invalidateFrameloop` -> `frameloop='demand'`
- `setDefaultCamera`-> `const set = useThree(state => state.set); set({ camera: customCamera })`

### Still missing

React-native: https://github.com/pmndrs/react-three-fiber/issues/1027
