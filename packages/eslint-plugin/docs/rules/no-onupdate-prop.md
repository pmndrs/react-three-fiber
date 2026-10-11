v10 removed the `onUpdate` prop. It ran after every prop update, for reasons unrelated to the props
you cared about, and not for the ones that mattered (imperative changes, anything set in
`useFrame`). It is no longer reserved, so it is now assigned to the object like any other prop: on a
`<texture>` it sets three's own `Texture.onUpdate`, which fires after a GPU upload rather than after
prop changes, and on most other objects it does nothing.

Use one of these instead:

- an effect keyed on the props that change, reading the object through a ref
- `useFrame`, to read the object every frame
- a ref callback (stable, via `useCallback`), for one-time setup

Part of the [`migration`](../../README.md#migration) config.

#### ❌ Incorrect

```js
<bufferGeometry onUpdate={(self) => self.computeVertexNormals()}>
  <bufferAttribute attach="attributes-position" args={[positions, 3]} />
</bufferGeometry>
```

#### ✅ Correct

```js
const ref = useRef()
useEffect(() => ref.current.computeVertexNormals(), [positions])

<bufferGeometry ref={ref}>
  <bufferAttribute attach="attributes-position" args={[positions, 3]} />
</bufferGeometry>
```
