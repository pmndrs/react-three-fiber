---
title: Performance pitfalls
description: Performance 1x1
nav: 12
---

## Tips and Tricks

This is a good overview: https://discoverthreejs.com/tips-and-tricks

The most important gotcha in three.js is that creating objects can be expensive, think twice before you mount/unmount things! Every material or light that you put into the scene has to compile, every geometry you create will be processed. Share materials and geometries if you can, either in global scope or locally:

```jsx
const geom = useMemo(() => new BoxGeometry(), [])
const mat = useMemo(() => new MeshBasicMaterial(), [])
return items.map(i => <mesh geometry={geom} material={mat} ...
```

Try to use [instancing](https://codesandbox.io/s/r3f-instanced-colors-8fo01) as much as you can when you need to display many objects of a similar type!

## Avoid setState in loops

TLDR, don't, mutate inside `useFrame`!

- Threejs has a render-loop, it does not work like the DOM does. **Fast updates are carried out in `useFrame` by mutation**. `useFrame` is your per-component render-loop.

- It is not enough to set values in succession, _you need frame deltas_. Instead of `position.x += 0.1` consider `position.x += delta` or your project will run at different speeds depending on the end-users system. Many updates in threejs need to be paired with update flags (`.needsUpdate = true`), or imperative functions (`.updateProjectionMatrix()`).

- You might be tempted to setState inside `useFrame` but there is no reason to. You would only complicate something as simple as an update by routing it through React's scheduler, triggering component render etc.

### ❌ `setState` in loops is bad

```jsx
useEffect(() => {
  const interval = setInterval(() => setX((x) => x + 0.1), 1)
  return () => clearInterval(interval)
}, [])
```

### ❌ `setState` in useFrame is bad

```jsx
const [x, setX] = useState(0)
useFrame(() => setX((x) => x + 0.1))
return <mesh position-x={x} />
```

### ❌ `setState` in fast events is bad

```jsx
<mesh onPointerMove={(e) => setX((x) => e.point.x)} />
```

### ✅ Instead, just mutate, use deltas

In general you should prefer useFrame. Consider mutating props safe as long as the component is the only entity that mutates. Use deltas instead of fixed values so that your app is refresh-rate independent and runs at the same speed everywhere!

```jsx
const meshRef = useRef()
useFrame((state, delta) => (meshRef.current.position.x += delta))
return <mesh ref={meshRef} />
```

Same goes for events, use references.

```jsx
<mesh onPointerMove={(e) => (ref.current.position.x = e.point.x)} />
```

If you must use intervals, use references as well, but keep in mind that this is not refresh-rate independent.

```jsx
useEffect(() => {
  const interval = setInterval(() => ref.current.position.x += 0.1, 1)
  return () => clearInterval(interval)
}, [])
```

## Handle animations in loops

The frame loop is where you should place your animations. For instance using lerp, or damp.

### ✅ Use `lerp` + `useFrame`

```jsx
function Signal({ active }) {
  const meshRef = useRef()
  useFrame((state, delta) => {
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, active ? 100 : 0, 0.1)
  })
  return <mesh ref={meshRef} />
```

### ✅ Or react-spring

Or, use animation libraries. React-spring has its own frame-loop and animates outside of React. Framer-motion is another popular alternative.

```jsx
import { a, useSpring } from '@react-spring/three'

function Signal({ active }) {
  const { x } = useSpring({ x: active ? 100 : 0 })
  return <a.mesh position-x={x} />
```

## Do not bind to fast state reactively

Using state-managers and selective state is fine, but not for updates that happen rapidly for the same reason as above.

### ❌ Don't bind reactive fast-state

```jsx
import { useSelector } from 'react-redux'

// Assuming that x gets animated inside the store 60fps
const x = useSelector((state) => state.x)
return <mesh position-x={x} />
```

### ✅ Fetch state directly

For instance using [Zustand](https://github.com/pmndrs/zustand) (same in Redux et al).

```jsx
useFrame(() => (ref.current.position.x = api.getState().x))
return <mesh ref={ref} />
```

## Don't mount indiscriminately

In threejs it is very common to not re-mount at all, see the ["disposing of things"](https://discoverthreejs.com/tips-and-tricks/) section in discover-three. This is because buffers and materials get re-initialized/compiled, which can be expensive.

### ❌ Avoid mounting runtime

```jsx
{
  stage === 1 && <Stage1 />
}
{
  stage === 2 && <Stage2 />
}
{
  stage === 3 && <Stage3 />
}
```

### ✅ Consider using visibility instead

```jsx
<Stage1 visible={stage === 1} />
<Stage2 visible={stage === 2} />
<Stage3 visible={stage === 3} />

function Stage1(props) {
  return (
    <group {...props}>
      ...
```

### ✅ Use `startTransition` for expensive ops

React 18 introduces the `startTransition` and `useTransition` APIs to defer and schedule work and state updates. Use these to de-prioritize expensive operations.

Since version 8 of Fiber canvases use concurrent mode by default, which means React will schedule and defer expensive operations. You don't need to do anything, but you can play around with the [experimental scheduler](https://github.com/drcmda/scheduler-test) and see if marking ops with a lesser priority makes a difference.

```jsx
import { useTransition } from 'react'
import { Points } from '@react-three/drei'

const [isPending, startTransition] = useTransition()
const [radius, setRadius] = useState(1)
const positions = calculatePositions(radius)
const colors = calculateColors(radius)
const sizes = calculateSizes(radius)

<Points
  positions={positions}
  colors={colors}
  sizes={sizes}
  onPointerOut={() => {
    startTransition(() => {
      setRadius(prev => prev + 1)
    })
  }}
>
  <meshBasicMaterial vertexColors />
</Points>
```

## Don't re-create objects in loops

Try to avoid creating too much effort for the garbage collector, re-pool objects when you can!

### ❌ Bad news for the GC

This creates a new vector 60 times a second, which allocates memory and forces the GC to eventually kick in.

```jsx
useFrame(() => {
  ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1)
})
```

### ✅ Better re-use object

Set up re-used objects in global or local space, now the GC will be silent.

```jsx
function Foo(props)
  const vec = new THREE.Vector()
  useFrame(() => {
    ref.current.position.lerp(vec.set(x, y, z), 0.1)
  })
```

## `useLoader` instead of plain loaders

Threejs loaders give you the ability to load async assets (models, textures, etc), but if you do not re-use assets it can quickly become problematic.

### ❌ No re-use is bad for perf

This re-fetches, re-parses for every component instance.

```jsx
function Component() {
  const [texture, set] = useState()
  useEffect(() => void new TextureLoader().load(url, set), [])
  return texture ? (
    <mesh>
      <sphereGeometry />
      <meshBasicMaterial map={texture} />
    </mesh>
  ) : null
}
```

Instead use useLoader, which caches assets and makes them available throughout the scene.

### ✅ Cache and re-use objects

```jsx
function Component() {
  const texture = useLoader(TextureLoader, url)
  return (
    <mesh>
      <sphereGeometry />
      <meshBasicMaterial map={texture} />
    </mesh>
  )
}
```

Regarding GLTF's try to use [GLTFJSX](https://github.com/pmndrs/gltfjsx) as much as you can, this will create immutable JSX graphs which allow you to even re-use full models.
