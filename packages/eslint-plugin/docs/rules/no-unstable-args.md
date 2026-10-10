R3F builds a three.js object from `args` once, and compares `args` on every render element by
element with `!==`. A new object in `args` (a `new X()`, an array or object literal, a function, a
`.clone()`) is never equal to the last render's, so R3F constructs a new object and disposes the old
one on **every render**. Geometries and attributes are rebuilt and re-uploaded to the GPU, and
anything holding the old object loses it.

`<primitive object>` is compared by reference the same way, so a new object there swaps the
primitive on every render.

Numbers, strings and stable references (props, state, memoized values) are fine.

#### ❌ Incorrect

```js
function Points({ positions }) {
  return (
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[new Float32Array(positions), 3]} />
    </bufferGeometry>
  )
}
```

```js
function Path({ points }) {
  return <tubeGeometry args={[new CatmullRomCurve3(points), 64, 0.1]} />
}
```

```js
function Model({ scene }) {
  return <primitive object={scene.clone()} />
}
```

#### ✅ Correct

```js
function Points({ positions }) {
  const array = useMemo(() => new Float32Array(positions), [positions])
  return (
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[array, 3]} />
    </bufferGeometry>
  )
}
```

```js
function Path({ points }) {
  const curve = useMemo(() => new CatmullRomCurve3(points), [points])
  return <tubeGeometry args={[curve, 64, 0.1]} />
}
```

```js
function Model({ scene }) {
  const copy = useMemo(() => scene.clone(), [scene])
  return <primitive object={copy} />
}
```
