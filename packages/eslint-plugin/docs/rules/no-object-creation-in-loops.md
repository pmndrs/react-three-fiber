Creating new objects every frame wastes large amounts of memory causing the garbage collector to do more work than needed.
Instead,
reuse objects from outside the frame loop.

#### ❌ Incorrect

This creates a new vector 60+ times a second which allocates a lot of memory and forces the garbage collector to eventually kick in cleaning up loads of objects.

```js
useFrame(() => {
  ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1)
})
```

```js
useFrame(() => {
  ref.current.position.clone()
})
```

#### ✅ Correct

This creates a vector outside of the frame loop to be reused causing no extra effort for the garbage collector.

```js
const vec = new THREE.Vector3()

useFrame(() => {
  ref.current.position.lerp(vec.set(x, y, z), 0.1)
})
```

```js
const vec = new THREE.Vector3()

useFrame(() => {
  ref.current.position.copy(vec)
})
```
