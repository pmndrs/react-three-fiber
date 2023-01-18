Cloning vectors in the frame loop instantiates new objects wasting large amounts of memory causing the collector to do more work than needed.
Instead,
reuse objects from outside.

#### ❌ Incorrect

This creates a new vector 60+ times a second which allocates loads of memory and forces the garbage collector to eventually kick in cleaning them up.

```js
useFrame(() => {
  const newPos = ref.current.position.clone()
  newPos.x += 1.0
})
```

#### ✅ Correct

This creates a vector outside of the frame loop to be reused causing no extra effort for the garbage collector.

```js
const vec = new THREE.Vector3()

useFrame(() => {
  const newPos = ref.current.position.copy(vec)
  newPos.x += 1.0
})
```
