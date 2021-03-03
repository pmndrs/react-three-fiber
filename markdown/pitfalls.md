# Performance pitfalls

## Table of Contents
- [WebGL performance pitfalls](#webgl-pitfalls)
    - [Tips and Tricks](#tips-and-tricks)
- [React performance pitfalls](#react-pitfalls)
    - [Never, ever, setState animations](#never-ever-set-state)
    - [Never let React anywhere near animated updates](#never-let-react-animate)
    - [Never bind often occuring reactive state to a component](#never-bind-reactive-component)
    - [Do not mount/unmount things indiscriminately](#do-not-mount-unmount-indiscriminately)
    - [Do not re-create objects in loops](#do-not-re-create-objects-in-loops)

## WebGL performance pitfalls ☠️ <a id="webgl-pitfalls"></a>

### Tips and Tricks <a id="tips-and-tricks"></a>

This is the best overview I could find: https://discoverthreejs.com/tips-and-tricks

The most important is gotcha in Threejs is that creating objects can be expensive, think twice before you mount/unmnount things! Every material or light that you put into the scene has to compile, every geometry you create will be processed. Share materials and geometries if you can, either in global scope or locally:

```jsx
const geom = useMemo(() => new BoxBufferGeometry(), [])
const mat = useMemo(() => new MeshBasicMaterial(), [])
return items.map(i => <mesh geometry={geom} material={mat} ...
```

Try to use [instancing](https://codesandbox.io/s/r3f-instanced-colors-8fo01) as much as you can when you need to display many objects of a similar type!

## React performance pitfalls ☠️ <a id="react-pitfalls"></a>

### Never, ever, setState animations! <a id="never-ever-set-state"></a>

Avoid forcing a full component (+ its children) through React and its diffing mechanism 60 times per second.

#### ❌ This is problematic

```jsx
const [x, setX] = useState(0)
useFrame(() => setX(x => x + 0.01))
// Or, just as bad ...
// useEffect(() => void setInterval(() => setX(x => x + 0.01), 1), [])
return <mesh position-x={x} />
```

#### ✅ Instead, use refs and mutate! This is totally fine and that's how you would do it in plain Threejs as well.

```jsx
const ref = useRef()
useFrame(() => ref.current.position.x += 0.01)
return <mesh ref={ref} />
```

### Never let React anywhere near animated updates! <a id="never-let-react-animate"></a>

Instead use lerp, or animation libs that animate outside of React! Avoid libs like react-motion that re-render the component 60fps!

#### ✅ Using [lerp](https://github.com/mattdesl/lerp) + useFrame:

```jsx
function Signal({ active }) {
  const ref = useRef()
  useFrame(() => ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, active ? 100 : 0, 0.1))
  return <mesh ref={ref} />
```

#### ✅ Or [react-spring](https://github.com/react-spring/react-spring), which animates outside of React:

```jsx
import { a, useSpring } from 'react-spring/three'

function Signal({ active }) {
  const { x } = useSpring({ x: active ? 100 : 0 })
  return <a.mesh position-x={x} />
```

### Never bind often occuring reactive state to a component! <a id="never-bind-reactive-component"></a>

Using state-managers and selected state is fine, but not for updates that happen rapidly!

#### ❌ This is problematic

```jsx
import { useSelector } from 'react-redux'

// Assuming that x gets animated inside the store 60fps
const x = useSelector(state => state.x)
return <mesh position-x={x} />
```

#### ✅ Fetch state directly, for instance using [zustand](https://github.com/react-spring/zustand):

```jsx
useFrame(() => ref.current.position.x = api.getState().x)
return <mesh ref={ref} />
```

#### ✅ Or, subscribe to your state [in a way that doesn't re-render](https://github.com/react-spring/zustand#transient-updates-for-often-occuring-state-changes) the component:

```jsx
const ref = useRef()
useEffect(() => api.subscribe(x => ref.current.position.x = x, state => state.x), [])
return <mesh ref={ref} />
```

### Do not mount/unmount things indiscriminately! <a id="do-not-mount-unmount-indiscriminately"></a>

In Threejs it is very common to not re-mount at all, see the ["disposing of things"](https://discoverthreejs.com/tips-and-tricks/) section in discover-three. This is because materials get re-compiled, etc.

#### ✅ Use concurrent mode:

Switch React to `@experimental` and flag the canvas as concurrent. Now React will schedule and defer expensive operations. You don't need to do anything else, but you can play around with the [experimental scheduler](https://github.com/drcmda/scheduler-test) and see if marking ops with a lesser priority makes a difference.

```jsx
<Canvas concurrent />
```

### Do not re-create objects in loops

Try to avoid creating too much effort for the garbage collector, re-pool objects when you can!

#### ❌ This creates a new vector 60 times a second:

```jsx
useFrame(() => {
  ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1)
})
```

#### ✅ This will re-use a vector and even remember its value on re-render:

```jsx
const [vec] = useState(() => new THREE.Vector3())
useFrame(() => {
  ref.current.position.lerp(vec.set(x, y, z), 0.1)
})
```
