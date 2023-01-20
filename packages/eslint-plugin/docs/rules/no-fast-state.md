Setting state too quickly in the frame loop,
events,
and timers,
can cause performance problems from React scheduling too much work.
Instead mutate your scene objects.

#### ❌ Incorrect

This sets state to increase `x` by 0.1 every 16ms causing React to schedule too much work.

```js
function MoveRight() {
  const [x, setX] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setX((x) => x + 0.1), 16)
    return () => clearInterval(interval)
  }, [])

  return <mesh position-x={x} />
}
```

This sets state to increase `x` by 0.1 each frame causing React to schedule too much work.

```js
function MoveRight() {
  const [x, setX] = useState(0)

  useFrame(() => {
    setX((x) => x + 0.1)
  })

  return <mesh position-x={x} />
}
```

This sets state to update `x` every time the pointer moves over the scene object causing React to schedule too much work.

```js
function MatchPointer() {
  const [x, setX] = useState(0)

  return <mesh onPointerMove={(e) => setX((x) => e.point.x)} />
}
```

#### ✅ Correct

This mutates the scene object to increase `x` by approximately 0.1 every frame.

> **Note** – instead of increasing `x` by a fixed amount in the frame loop multiply by `delta`, the time since last frame, enabling movement to be independent of <abbr title="Frames per second">FPS</abbr> so regardless if your app runs at 10 or 120 FPS your scene will move the same relative amount over time.

```js
function MoveRight() {
  const ref = useRef()

  useFrame((_, delta) => {
    ref.current.position.x += 63 * delta // ~1.008 when 60fps
  })

  return <mesh ref={ref} />
}
```

This mutates the scene object to set `x` every time the pointer moves over the scene object.

```js
function MatchPointer() {
  const ref = useRef()

  return (
    <mesh
      onPointerMove={(e) => {
        ref.current.position.x = e.point.x
      }}
    />
  )
}
```
