# 6.0.0

### Monorepo

```diff
--- npm install react-three-fiber
+++ npm install @react-three/fiber
```

### Features

- [x] Use r3f without react-dom (saves ~30kb)

```jsx
import React from 'react'
import { render } from 'react-three-fiber'

render(<mesh />, document.getElementById('canvas'), { shadows: true, ... })
```

- [x] Moving to zustand for reactive internal state

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

This is an opt in feature that makes it possible to create components that could be dropped into the scene that will reduce visuals if the system is in regression, similar to what Sketchfab does (lower textures, fbo's etc on camera movement and so on).

https://github.com/pmndrs/react-three-fiber/issues/1070

- [x] Object shortcuts (specifically objects that feature `setScalar`)

```jsx
<mesh position={0} scale={1} rotation={Math.PI} />
```

- [x] Clock control

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
