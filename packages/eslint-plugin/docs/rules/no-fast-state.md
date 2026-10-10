Setting React state in the frame loop re-renders the component on every frame, 60 or more times a
second. Each of those renders runs the component, diffs its tree and commits the result, which is
far more work than the frame itself needs. Mutate the object (or a ref) directly instead, and keep
React state for values that change rarely.

The rule reports calls inside a frame callback to:

- setters from `useState` and dispatchers from `useReducer`
- `setX` props, such as `function Mover({ setPosition })`
- the R3F store's `set`, `setSize`, `setDpr`, `setEvents` and `setFrameloop`, from the frame state or `useThree`

A frame callback is any function handed to `useFrame`, `addEffect`, `addAfterEffect`,
`setRenderOverride` or the frame scheduler's `register`, whether inline or by reference.

The same applies to `onPointerMove` and `onWheel` handlers on three.js elements, which fire on every
pointer event while the pointer moves: setters from `useState`/`useReducer` and `setX` props called
there are reported too. DOM elements (`<div onPointerMove>`) are not checked.

#### ❌ Incorrect

This re-renders `RotatingBox` every frame.

```js
function RotatingBox() {
  const [rotation, setRotation] = useState(0)

  useFrame((state, delta) => {
    setRotation((r) => r + delta)
  })

  return <mesh rotation-y={rotation} />
}
```

#### ✅ Correct

Mutate the object through a ref, which never re-renders.

```js
function RotatingBox() {
  const ref = useRef()

  useFrame((state, delta) => {
    ref.current.rotation.y += delta
  })

  return <mesh ref={ref} />
}
```

Polling is fine when the update is guarded so that state is set only when it changes. Check both
the condition and the current state, so the setter runs once per change rather than every frame:

```js
function Boundary({ target }) {
  const [isOutside, setIsOutside] = useState(false)

  useFrame(() => {
    const outside = target.current.position.x > 200
    if (outside !== isOutside) setIsOutside(outside)
  })

  return isOutside ? <Warning /> : null
}
```

```js
// ❌ Re-renders on every pointer move
function Hover() {
  const [point, setPoint] = useState()
  return <mesh onPointerMove={(e) => setPoint(e.point)} />
}
```

## Options

### `allowGuarded`

Default: `true`. Calls behind a condition are allowed: an `if`/`switch` branch, a ternary branch,
the right side of `&&`, `||` or `??`, or after an early `if (...) return`. The condition itself is
not inspected, so any guard counts.

Set it to `false` to report every state update in the frame loop, guarded or not:

```json
{
  "rules": {
    "@react-three/no-fast-state": ["error", { "allowGuarded": false }]
  }
}
```

### `events`

Default: `true`. Set it to `false` to check only the frame loop, not `onPointerMove` and `onWheel`
handlers.
