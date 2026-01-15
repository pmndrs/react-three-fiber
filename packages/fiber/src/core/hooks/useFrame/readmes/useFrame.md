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

## Using Outside Canvas

`useFrame` works both inside and outside the `<Canvas>` component, enabling frame-based logic in UI components, state managers, and even completely independent applications.

### Inside Canvas (Standard)

Full access to R3F state (gl, scene, camera, etc.):

```tsx
function SpinningBox() {
  useFrame((state, delta) => {
    // state.gl, state.scene, state.camera, etc. available
  })
  return <mesh>...</mesh>
}
```

### Outside Canvas (Waiting Mode)

When used outside Canvas, `useFrame` waits for a Canvas to mount, then fires with full state:

```tsx
function App() {
  return (
    <>
      <GameUI /> {/* Outside Canvas */}
      <Canvas>
        <Scene />
      </Canvas>
    </>
  )
}

function GameUI() {
  // Waits for Canvas, then gets full RootState
  const { scheduler } = useFrame((state, delta) => {
    syncUI(state.camera.position)
  })

  return <button onClick={() => scheduler.pauseJob('physics')}>Pause</button>
}
```

### Independent Mode (No Canvas)

For standalone frame loops without any Canvas:

```tsx
import { getScheduler, useFrame } from '@react-three/fiber'

// Enable independent mode - no Canvas needed
getScheduler().independent = true

function GameLoop() {
  useFrame((state, delta) => {
    // state = { time, delta, elapsed, frame } only
    // No gl, scene, camera (no Canvas exists)
    updateGame(delta)
  })
  return null
}
```

### Scheduler Access Only

Get scheduler access without a frame callback:

```tsx
function PauseButton() {
  // No callback - just need scheduler access from anywhere
  const { scheduler } = useFrame()

  return <button onClick={() => (scheduler.frameloop = 'never')}>Stop Rendering</button>
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

### Callback Function

The callback receives two parameters:

**`state: FrameState`** - The complete frame state object:

```typescript
interface FrameState extends RootState {
  time: number // High-resolution timestamp from RAF (milliseconds)
  delta: number // Time since last frame (seconds, for THREE.Clock compatibility)
  elapsed: number // Elapsed time since first frame (seconds)
  frame: number // Incrementing frame counter
  // ... plus all RootState properties (gl, scene, camera, etc.)
}
```

**`delta: number`** - Time since last frame in seconds (convenience parameter, same as `state.delta`)

### Options Object

```tsx
interface UseFrameOptions {
  id?: string // Unique ID for this job (auto-generated if not provided)
  phase?: string // Phase to run in (default: 'update')
  before?: string | string[] // Run before this phase or job ID
  after?: string | string[] // Run after this phase or job ID
  priority?: number // Priority within phase (higher runs first, default: 0)
  fps?: number // Max frames per second for this job
  drop?: boolean // Skip frames when behind (default: true) or catch up (false)
  enabled?: boolean // Enable/disable without unregistering (default: true)
}
```

**Option Details:**

| Option     | Type                 | Default    | Description                                                                                                |
| ---------- | -------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `id`       | `string`             | auto       | Unique identifier for this job. Auto-generated using React's `useId()` if not provided.                    |
| `phase`    | `string`             | `'update'` | Named phase to run in. Default phases: `start`, `input`, `physics`, `update`, `render`, `finish`.          |
| `before`   | `string \| string[]` | -          | Run before this phase or job ID. Creates auto-generated phase if needed.                                   |
| `after`    | `string \| string[]` | -          | Run after this phase or job ID. Creates auto-generated phase if needed.                                    |
| `priority` | `number`             | `0`        | Priority within phase. Higher values run first. Used for tie-breaking within same phase.                   |
| `fps`      | `number`             | -          | Max frames per second for this job. Useful for throttling expensive operations. No limit if not specified. |
| `drop`     | `boolean`            | `true`     | When FPS limited: `true` = drop missed frames, `false` = catch-up semantics for time-sensitive logic.      |
| `enabled`  | `boolean`            | `true`     | Enable/disable job without unregistering. Job remains in scheduler but won't execute when `false`.         |

### Return Value: Controls Object

```tsx
interface FrameControls {
  id: string // The job's unique ID
  scheduler: Scheduler // Access to the global scheduler (see Scheduler API)
  step(timestamp?: number): void // Manually step this job only (bypasses FPS limiting)
  stepAll(timestamp?: number): void // Manually step ALL jobs in the scheduler
  pause(): void // Pause this job (set enabled=false)
  resume(): void // Resume this job (set enabled=true)
  isPaused: boolean // Reactive paused state - triggers re-render when changed
}
```

**Controls Details:**

| Property    | Type                           | Description                                                                                       |
| ----------- | ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `id`        | `string`                       | The job's unique identifier. Useful for debugging and referencing the job elsewhere.              |
| `scheduler` | `Scheduler`                    | Access to the global scheduler instance. See [Scheduler API](./scheduler.md) for details.         |
| `step()`    | `(timestamp?: number) => void` | Manually execute this job once. Bypasses FPS limiting. Timestamp defaults to `performance.now()`. |
| `stepAll()` | `(timestamp?: number) => void` | Manually execute all registered jobs once. Useful for `frameloop='never'` mode.                   |
| `pause()`   | `() => void`                   | Pause this job. Job remains registered but won't execute until resumed.                           |
| `resume()`  | `() => void`                   | Resume a paused job. Resets timing to prevent frame accumulation.                                 |
| `isPaused`  | `boolean`                      | Reactive state that triggers component re-render when pause/resume is called.                     |

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

## Advanced Features

### FPS Throttling with Drop/Catch-up

FPS throttling limits how often a job runs, useful for expensive operations that don't need to run every frame.

**Drop Mode (`drop: true`, default):**

- Skips missed frames when behind schedule
- Good for visual updates, UI updates, non-critical logic
- Maintains target FPS but may skip intermediate states

```tsx
// Heavy computation at 30 FPS - skip missed frames
useFrame(
  (state, delta) => {
    expensiveComputation()
  },
  { fps: 30, drop: true },
)
```

**Catch-up Mode (`drop: false`):**

- Attempts to catch up on missed frames
- Good for physics, simulations, time-sensitive logic
- Maintains timing consistency but may run multiple times per RAF

```tsx
// Physics simulation at 60 FPS - maintain timing consistency
useFrame(
  (state, delta) => {
    physicsWorld.step(1 / 60)
  },
  { fps: 60, drop: false },
)
```

---

### Conditional Execution

Instead of early returns, use the `enabled` option for cleaner conditional logic:

```tsx
// ❌ Bad: Early return
useFrame((state, delta) => {
  if (!isActive) return
  // ... logic
})

// ✅ Good: Enabled flag
const isActive = useCondition()
useFrame(
  (state, delta) => {
    // ... logic
  },
  { enabled: isActive },
)
```

**Benefits:**

- Job remains registered, avoiding re-registration overhead
- Clearer intent in code
- Better for performance monitoring/debugging

---

### Before/After Constraints

Use `before` and `after` to create dependencies between jobs without defining explicit phases:

```tsx
// Job A runs first
useFrame(
  (state, delta) => {
    // Update transforms
  },
  { id: 'transforms' },
)

// Job B runs after Job A
useFrame(
  (state, delta) => {
    // Update effects that depend on transforms
  },
  { id: 'effects', after: 'transforms' },
)

// Job C runs before Job A
useFrame(
  (state, delta) => {
    // Input handling
  },
  { before: 'transforms' },
)
```

**Notes:**

- Auto-generates phases like `before:transforms` and `after:transforms`
- Can specify multiple dependencies: `before: ['jobA', 'jobB']`
- Useful for loose coupling without global phase definitions

---

### Reactive Paused State

The `isPaused` property triggers component re-renders when the job is paused/resumed:

```tsx
function PausableAnimation() {
  const controls = useFrame(
    (state, delta) => {
      // Animation logic
    },
    { id: 'my-animation' },
  )

  return (
    <>
      <button onClick={() => (controls.isPaused ? controls.resume() : controls.pause())}>
        {controls.isPaused ? '▶ Resume' : '⏸ Pause'}
      </button>

      {/* UI updates automatically when paused state changes */}
      <div>Status: {controls.isPaused ? 'Paused' : 'Running'}</div>
    </>
  )
}
```

**Implementation:**

- Uses React's `useSyncExternalStore` for reactivity
- Subscribes to job state changes via `scheduler.subscribeJobState()`
- No manual `forceUpdate()` or state management needed

---

## Best Practices

1. **Use phases for ordering** - Instead of priority numbers, use phases for clearer intent
2. **Use FPS throttling for heavy work** - Don't run expensive computations every frame
3. **Use `enabled` for conditional logic** - Instead of early returns, use `enabled: false`
4. **Use unique IDs for debugging** - Named jobs are easier to track in dev tools
5. **Minimize re-registration** - Options changes cause re-registration; use `enabled` for toggling
6. **Match delta to your needs** - Use `drop: true` for visual updates, `drop: false` for simulations
7. **Access scheduler for advanced control** - Use `controls.scheduler` for frame loop manipulation

---

## Related Documentation

- **[Scheduler API Reference](./scheduler.md)** - Deep dive into the Scheduler class and advanced frame loop control
- **[Canvas Props](https://docs.pmnd.rs/react-three-fiber/api/canvas)** - Canvas configuration including `frameloop` prop
- **[Hooks Overview](https://docs.pmnd.rs/react-three-fiber/api/hooks)** - All available hooks in react-three-fiber
