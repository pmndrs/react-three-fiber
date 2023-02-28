Instantiating new objects in the frame loop can waste large amounts of memory,
which is especially bad for large CPU containers such as Three.js classes and any GPU resource as there is no reliable garbage collection.
Instead create once in a `useMemo` or a single shared reference outside of the component.

#### ❌ Incorrect

This creates a new vector 60+ times a second allocating large amounts of memory.

```js
function MoveTowards({ x, y, z }) {
  const ref = useRef()

  useFrame(() => {
    ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1)
  })

  return <mesh ref={ref} />
}
```

#### ✅ Correct

This creates a vector outside of the frame loop to be reused each frame.

```js
const tempVec = new THREE.Vector3()

function MoveTowards({ x, y, z }) {
  const ref = useRef()

  useFrame(() => {
    ref.current.position.lerp(tempVec.set(x, y, z), 0.1)
  })

  return <mesh ref={ref} />
}
```

This creates a vector once outside of the frame loop inside a `useMemo` to be reused each frame.

```js
function MoveTowards({ x, y, z }) {
  const ref = useRef()
  const tempVec = useMemo(() => new THREE.Vector3())

  useFrame(() => {
    ref.current.position.lerp(tempVec.set(x, y, z), 0.1)
  })

  return <mesh ref={ref} />
}
```
