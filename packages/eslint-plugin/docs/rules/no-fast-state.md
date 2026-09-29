Setting React state inside `useFrame` triggers a component re-render every frame (60+ fps),
which is one of the most common performance problems in R3F applications.
Instead, use refs to mutate values directly. If you must update React state,
wrap the call with `startTransition` and consider throttling.

#### ❌ Incorrect

Setting state inside useFrame causes a re-render every single frame.

```js
function RotatingBox() {
  const [rotation, setRotation] = useState(0)

  useFrame(() => {
    setRotation((r) => r + 0.01)
  })

  return <mesh rotation-y={rotation} />
}
```

#### ✅ Correct

Use a ref to mutate the value directly without triggering re-renders.

```js
function RotatingBox() {
  const ref = useRef()

  useFrame(() => {
    ref.current.rotation.y += 0.01
  })

  return <mesh ref={ref} />
}
```

If you must update React state from the frame loop, wrap with `startTransition` to avoid blocking the main thread and consider throttling the updates:

```js
function PositionTracker() {
  const [position, setPosition] = useState([0, 0, 0])
  const ref = useRef()

  useFrame(() => {
    // eslint-disable-next-line @react-three/no-fast-state
    startTransition(() => {
      setPosition(ref.current.position.toArray())
    })
  })

  return <mesh ref={ref} />
}
```
