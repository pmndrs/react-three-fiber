# Frame Loop System Overview

React-three-fiber's frame loop system provides a powerful, flexible way to execute code on every frame.

## Quick Start

### Basic Animation

```tsx
import { useFrame } from '@react-three/fiber'

function RotatingBox() {
  const meshRef = useRef()

  useFrame((state, delta) => {
    meshRef.current.rotation.y += delta
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

### Phase-Based Execution

```tsx
// Physics runs before general updates
useFrame(
  (state, delta) => {
    physicsWorld.step(delta)
  },
  { phase: 'physics' },
)

// Updates run after physics (default phase)
useFrame((state, delta) => {
  updateGameLogic(delta)
})
```

### FPS Throttling

```tsx
// Heavy computation at 30 FPS
useFrame(
  (state, delta) => {
    expensiveOperation()
  },
  { fps: 30 },
)
```

### Pause and Resume

```tsx
function PausableAnimation() {
  const controls = useFrame((state, delta) => {
    // Animation logic
  })

  return (
    <button onClick={() => (controls.isPaused ? controls.resume() : controls.pause())}>
      {controls.isPaused ? 'Resume' : 'Pause'}
    </button>
  )
}
```

---

## Architecture

```
requestAnimationFrame()
├── globalBefore jobs (deprecated)
├── For each root (Canvas):
│   ├── start phase
│   ├── input phase
│   ├── physics phase
│   ├── update phase (default)
│   ├── render phase
│   └── finish phase
├── globalAfter jobs (deprecated)
└── onIdle callbacks (demand mode)
```

**Default Phases:**

1. `start` - Early frame setup
2. `input` - Input processing
3. `physics` - Physics simulation
4. `update` - General updates (default)
5. `render` - Custom rendering logic
6. `finish` - Frame cleanup

---

## Frame Loop Modes

Control via the Canvas `frameloop` prop:

### `frameloop="always"` (default)

Continuous rendering - callbacks run every animation frame.

```tsx
<Canvas frameloop="always">
  <Scene />
</Canvas>
```

### `frameloop="demand"`

Render only when `invalidate()` is called.

```tsx
import { invalidate } from '@react-three/fiber'
;<Canvas frameloop="demand">
  <StaticScene />
</Canvas>

function StaticScene() {
  const handleClick = () => {
    updateState()
    invalidate() // Request a frame
  }

  return <mesh onClick={handleClick} />
}
```

### `frameloop="never"`

Manual control - use `stepAll()` to advance frames.

```tsx
;<Canvas frameloop="never">
  <ManualScene />
</Canvas>

function ManualScene() {
  const { stepAll } = useFrame((state, delta) => {
    // Only runs when stepAll() is called
  })

  return <button onClick={stepAll}>Step Frame</button>
}
```

---

## Documentation

- **[useFrame Hook](./useFrame.md)** - Full API reference, options, examples, best practices
- **[Scheduler API](./scheduler.md)** - Advanced scheduler control, phase management, testing
- **[Utilities & Migration](./frame-loop-api.md)** - `invalidate()`, `advance()`, legacy API migration
