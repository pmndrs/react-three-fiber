# useFrame Hook

The `useFrame` hook is the primary way to execute code on every frame in react-three-fiber. It provides a powerful, flexible system for managing frame-based animations, physics, and rendering logic.

## Basic Usage

```tsx
import { useFrame } from '@react-three/fiber'

function AnimatedBox() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    // Rotate the mesh every frame
    if (meshRef.current) {
      meshRef.current.rotation.y += delta
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry />
      <meshStandardMaterial />
    </mesh>
  )
}
```

## API

```tsx
const controls = useFrame(callback?, priorityOrOptions?)
```

### Parameters

| Parameter           | Type                                         | Description                                                             |
| ------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| `callback`          | `(state: FrameState, delta: number) => void` | Function called each frame. Optional if you only need scheduler access. |
| `priorityOrOptions` | `number \| UseFrameOptions`                  | Either a priority number (backwards compat) or an options object.       |

### Options Object

```tsx
interface UseFrameOptions {
  id?: string // Unique ID for this job (auto-generated if not provided)
  phase?: string // Phase to run in: 'start', 'input', 'physics', 'update', 'render', 'finish'
  before?: string | string[] // Run before this phase or job ID
  after?: string | string[] // Run after this phase or job ID
  priority?: number // Priority within phase (higher runs first, default: 0)
  fps?: number // Max frames per second for this job
  drop?: boolean // Skip frames when behind (default: true) or catch up (false)
  enabled?: boolean // Enable/disable without unregistering (default: true)
}
```

### Return Value: Controls Object

```tsx
interface FrameControls {
  id: string // The job's unique ID
  scheduler: Scheduler // Access to the global scheduler
  step(timestamp?: number): void // Manually step this job only
  stepAll(timestamp?: number): void // Manually step ALL jobs
  pause(): void // Pause this job
  resume(): void // Resume this job
  isPaused: boolean // Reactive paused state
}
```

## Examples

### Priority-Based Ordering (Backwards Compatible)

```tsx
// Lower priority runs first
useFrame((state, delta) => {
  // This runs first
}, -1)

useFrame((state, delta) => {
  // This runs second
}, 0)

useFrame((state, delta) => {
  // This runs third
}, 1)
```

### Phase-Based Ordering

The scheduler has default phases that run in order:

1. `start` - Early frame setup
2. `input` - Input processing
3. `physics` - Physics simulation
4. `update` - General updates (default)
5. `render` - Custom rendering logic
6. `finish` - Frame cleanup

```tsx
// Physics runs before general updates
useFrame(
  (state, delta) => {
    // Physics simulation
    world.step(delta)
  },
  { phase: 'physics' },
)

// Rendering runs after updates
useFrame(
  (state, delta) => {
    // Custom post-processing
  },
  { phase: 'render' },
)
```

### FPS Throttling

```tsx
// Run at max 30 FPS
useFrame(
  (state, delta) => {
    // Heavy computation
  },
  { fps: 30 },
)

// Run at 60 FPS with catch-up semantics
useFrame(
  (state, delta) => {
    // Time-sensitive logic
  },
  { fps: 60, drop: false },
)
```

### Pause and Resume

```tsx
function PausableAnimation() {
  const controls = useFrame(
    (state, delta) => {
      // Animation logic
    },
    { id: 'my-animation' },
  )

  return (
    <button onClick={() => (controls.isPaused ? controls.resume() : controls.pause())}>
      {controls.isPaused ? 'Resume' : 'Pause'}
    </button>
  )
}
```

### Manual Stepping (frameloop='never')

```tsx
function ManualRenderer() {
  const { stepAll } = useFrame((state, delta) => {
    // Frame logic
  })

  const handleClick = () => {
    // Manually advance one frame
    stepAll()
  }

  return <button onClick={handleClick}>Step Frame</button>
}
```

### Scheduler-Only Access

```tsx
function SchedulerController() {
  // No callback - just get scheduler access
  const { scheduler } = useFrame()

  const pauseAll = () => {
    scheduler.getJobIds().forEach((id) => scheduler.pauseJob(id))
  }

  return <button onClick={pauseAll}>Pause All</button>
}
```

### Custom Phases

```tsx
function GameLoop() {
  const { scheduler } = useFrame()

  useEffect(() => {
    // Add custom phase between physics and update
    scheduler.addPhase('ai', { after: 'physics', before: 'update' })
  }, [scheduler])

  useFrame(
    (state, delta) => {
      // AI logic runs after physics, before general updates
    },
    { phase: 'ai' },
  )

  return null
}
```

## Frame Loop Modes

The Canvas `frameloop` prop controls how the scheduler runs:

### `frameloop="always"` (default)

Continuous rendering - frame callback runs every animation frame.

```tsx
<Canvas frameloop="always">{/* Callbacks run continuously */}</Canvas>
```

### `frameloop="demand"`

Render only when `invalidate()` is called. Good for static scenes with occasional updates.

```tsx
;<Canvas frameloop="demand">
  <DemandComponent />
</Canvas>

function DemandComponent() {
  const { invalidate } = useThree()

  const handleUpdate = () => {
    // Make some changes...
    invalidate() // Request a frame
  }

  return <mesh onClick={handleUpdate} />
}
```

### `frameloop="never"`

Manual control - use `step()` or `stepAll()` to advance frames.

```tsx
;<Canvas frameloop="never">
  <ManualComponent />
</Canvas>

function ManualComponent() {
  const { stepAll } = useFrame((state, delta) => {
    // Only runs when stepAll() is called
  })

  return <button onClick={() => stepAll()}>Advance Frame</button>
}
```

## Migration from Legacy APIs

### From `addEffect`

```tsx
// OLD (deprecated)
import { addEffect } from '@react-three/fiber'
const unsub = addEffect((timestamp) => { ... })

// NEW
import { useFrame } from '@react-three/fiber'
useFrame((state, delta) => { ... }, { phase: 'start' })
```

### From `addAfterEffect`

```tsx
// OLD (deprecated)
import { addAfterEffect } from '@react-three/fiber'
const unsub = addAfterEffect((timestamp) => { ... })

// NEW
import { useFrame } from '@react-three/fiber'
useFrame((state, delta) => { ... }, { phase: 'finish' })
```

### From `addTail`

```tsx
// OLD (deprecated)
import { addTail } from '@react-three/fiber'
const unsub = addTail((timestamp) => { ... })

// NEW
import { useFrame } from '@react-three/fiber'
const { scheduler } = useFrame()
const unsub = scheduler.onIdle((timestamp) => { ... })
```

## Architecture

The useFrame hook is powered by a global singleton Scheduler that:

1. **Single RAF Loop** - One `requestAnimationFrame` loop for the entire application
2. **Multi-Root Support** - Multiple `<Canvas>` components share the same loop
3. **Phase System** - Jobs are organized into phases that run in order
4. **Priority Sorting** - Within each phase, higher priority jobs run first
5. **FPS Throttling** - Individual jobs can be rate-limited
6. **Demand Mode** - Supports `invalidate()` for on-demand rendering

```
Global Scheduler (RAF Loop)
├── globalBefore jobs (addEffect - deprecated)
├── For each registered root:
│   ├── start phase
│   ├── input phase
│   ├── physics phase
│   ├── update phase (default)
│   ├── render phase
│   └── finish phase
├── globalAfter jobs (addAfterEffect - deprecated)
└── onIdle callbacks (when loop stops)
```

## Best Practices

1. **Use phases for ordering** - Instead of priority numbers, use phases for clearer intent
2. **Use FPS throttling for heavy work** - Don't run expensive computations every frame
3. **Use `enabled` for conditional logic** - Instead of early returns, use `enabled: false`
4. **Use unique IDs for debugging** - Named jobs are easier to track in dev tools
5. **Clean up with returned unsubscribe** - For non-hook usage, always clean up
