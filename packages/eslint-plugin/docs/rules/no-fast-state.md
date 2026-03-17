Calling React state setters (`useState`, `useReducer`) inside `useFrame` triggers a full React re-render every frame. At 60fps this means 60 re-renders per second, which destroys performance. Use `useRef` instead and mutate the ref directly.

#### Incorrect

This calls `setPosition` every frame, causing 60 re-renders per second.

```js
function MovingBox() {
  const [position, setPosition] = useState([0, 0, 0])

  useFrame(({ clock }) => {
    setPosition([Math.sin(clock.elapsedTime), 0, 0])
  })

  return <mesh position={position} />
}
```

#### Correct

This mutates a ref directly, bypassing React's render cycle entirely.

```js
function MovingBox() {
  const meshRef = useRef()

  useFrame(({ clock }) => {
    meshRef.current.position.x = Math.sin(clock.elapsedTime)
  })

  return <mesh ref={meshRef} />
}
```

If you need both a ref for fast updates and React state for occasional reads, store the value in a ref and sync to state only when needed (e.g., on a throttled interval or user interaction).

```js
function MovingBox() {
  const meshRef = useRef()
  const [displayX, setDisplayX] = useState(0)

  useFrame(({ clock }) => {
    meshRef.current.position.x = Math.sin(clock.elapsedTime)
  })

  const handleClick = () => {
    setDisplayX(meshRef.current.position.x)
  }

  return <mesh ref={meshRef} onClick={handleClick} />
}
```
