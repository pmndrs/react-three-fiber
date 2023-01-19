Cloning vectors in the frame loop instantiates new objects wasting large amounts of memory,
which is especially bad for Three.js classes.
Instead create once in a `useMemo` or a single shared reference outside of the component.

#### ❌ Incorrect

This creates a new vector 60+ times a second allocating large amounts of memory.

```js
function Direction({ targetPosition }) {
  const ref = useRef()

  useFrame(() => {
    const direction = ref.current.position.clone().sub(targetPosition).normalize()
  })

  return <mesh ref={ref} />
}
```

#### ✅ Correct

This creates a vector outside of the frame loop to be reused each frame.

```js
const tempVec = new THREE.Vector3()

function Direction({ targetPosition }) {
  const ref = useRef()

  useFrame(() => {
    const direction = tempVec.copy(ref.current.position).sub(targetPosition).normalize()
  })

  return <mesh ref={ref} />
}
```

This creates a vector once outside of the frame loop inside a `useMemo` to be reused each frame.

```js
function Direction({ targetPosition }) {
  const ref = useRef()
  const tempVec = useMemo(() => new THREE.Vector3())

  useFrame(() => {
    const direction = tempVec.copy(ref.current.position).sub(targetPosition).normalize()
  })

  return <mesh ref={ref} />
}
```
