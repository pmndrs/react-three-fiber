# npx react-three-fiber

node helpers, see: https://twitter.com/0xca0a/status/1172183080452464640

## --jsx inputfile [outputfile]

<img src="https://i.imgur.com/U4cWrNN.gif" />

This command turns a GLTF file into a JSX component. This is still experimental.

```bash
npx react-three-fiber@beta scene.gltf Scene.js --jsx
```

You still need to be set up for asset loading and the actual GLTF has to be present in production. It just loads it, creates a hashmap of all the objects inside and writes out a JSX tree, which now you can freely alter.

A typical output looks like this:

```jsx
import React, { useState, useEffect } from 'react'
import { useLoader } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export default function Model(props) {
  const [gltf, objects] = useLoader(GLTFLoader, '/scene.glb')
  return (
    <group {...props}>
      <scene name="Scene">
        <mesh name="Cube000" position={[0.3222085237503052, 2.3247640132904053, 10.725556373596191]}>
          <bufferGeometry attach="geometry" {...objects[1].geometry} />
          <meshStandardMaterial attach="material" {...objects[1].material} name="sillones" />
        </mesh>
      </scene>
    </group>
  )
}
```

This componend suspends, so you can wrap it into `<Suspense />` for fallbacks and error-boundaries for error handling:

```jsx
<ErrorBoundary>
  <Suspense fallback={<Fallback />}>
    <Model />
  </Suspense>
</ErrorBoundary>
```

## --draco

Adds a DRACOLoader. You need to be set up for draco, the necessary files have to exist in your /public folder. By default it defaults to `/draco-gltf/` which should contain [dracos gltf decoder](https://github.com/mrdoob/three.js/tree/dev/examples/js/libs/draco/gltf).

It will then extend the loader:

```jsx
const [gltf, objects] = useLoader(GLTFLoader, '/stork.glb', loader => {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco-gltf/')
  loader.setDRACOLoader(dracoLoader)
})
```

## --animation

This adds a THREE.AnimationMixer to your component and extracts its clips:


```jsx
const actions = useRef()
const [mixer] = useState(() => new THREE.AnimationMixer())
useFrame((state, delta) => mixer.update(delta))
useEffect(() => {
  actions.current = {
    "storkFly_B_": mixer.clipAction(gltf.animations[0]),
  }
  return () => gltf.animations.forEach(clip => mixer.uncacheClip(clip))
}, [])
```

If you want to play an animation you can do so at any time:

```jsx
actions.current.storkFly_B_.play()
```