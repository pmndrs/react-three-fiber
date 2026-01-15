# Scheduler API Reference

The Scheduler is a global singleton that manages the frame loop and job execution for all react-three-fiber roots (Canvas instances). It provides a powerful system for organizing frame-based work using phases, priorities, and FPS throttling.

## Overview

**Features:**

- Single `requestAnimationFrame` loop for the entire application
- Multi-root support (multiple `<Canvas>` components share the same loop)
- Phase-based execution order with dynamic phase creation
- Priority-based sorting within phases
- Per-job FPS throttling with drop/catch-up semantics
- Pause/resume individual jobs
- Manual stepping for testing and `frameloop='never'` mode
- Demand mode support via `invalidate()`

## Architecture

```
Global Scheduler (RAF Loop)
├── globalBefore jobs (deprecated addEffect API)
├── For each registered root:
│   ├── start phase
│   ├── input phase
│   ├── physics phase
│   ├── update phase (default)
│   ├── render phase
│   └── finish phase
├── globalAfter jobs (deprecated addAfterEffect API)
└── onIdle callbacks (when loop stops)
```

## Getting the Scheduler Instance

```tsx
import { getScheduler } from '@react-three/fiber'

const scheduler = getScheduler()
```

Or via the `useFrame` hook:

```tsx
import { useFrame } from '@react-three/fiber'

function MyComponent() {
  const { scheduler } = useFrame()
  // ...
}
```

---

## Independent Mode

The scheduler can run independently without any Canvas, enabling frame-based logic in non-R3F applications.

### `independent` (getter/setter)

Enable independent mode for use without Canvas.

```tsx
import { getScheduler } from '@react-three/fiber'

// Enable independent mode - no Canvas needed
getScheduler().independent = true

// Now useFrame works without Canvas
// Callbacks receive timing-only state: { time, delta, elapsed, frame }
```

**Notes:**

- When `true`, creates a default root automatically
- Callbacks receive `FrameTimingState` (no `gl`, `scene`, `camera`)
- Useful for game loops, animations, or any frame-based logic outside R3F

---

## Checking Ready State

### `isReady` (getter)

Check if any root (Canvas) is registered.

```tsx
if (scheduler.isReady) {
  // At least one Canvas has mounted
}
```

---

### `onRootReady(callback)`

Subscribe to be notified when a root becomes available.

**Parameters:**

- `callback: () => void` - Called when first root registers

**Returns:** `() => void` - Unsubscribe function

**Behavior:**

- If already ready, fires immediately
- Otherwise, fires when first Canvas mounts

```tsx
scheduler.onRootReady(() => {
  console.log('Canvas is ready!')
})
```

---

## Phase Management

### `addPhase(name, options?)`

Add a named phase to the scheduler's execution order.

**Parameters:**

- `name: string` - The phase name (e.g., 'physics', 'postprocess')
- `options?: AddPhaseOptions` - Positioning options

**Options:**

```typescript
interface AddPhaseOptions {
  before?: string // Insert before this phase
  after?: string // Insert after this phase
}
```

**Examples:**

```tsx
// Add physics phase before update
scheduler.addPhase('physics', { before: 'update' })

// Add postprocess phase after render
scheduler.addPhase('postprocess', { after: 'render' })

// Append to end (no position specified)
scheduler.addPhase('cleanup')
```

**Notes:**

- Marks all roots for rebuild to incorporate the new phase
- Duplicate phase names are ignored with a warning
- Default phases: `start`, `input`, `physics`, `update`, `render`, `finish`

---

### `hasPhase(name)`

Check if a phase exists in the scheduler.

**Parameters:**

- `name: string` - The phase name to check

**Returns:** `boolean` - `true` if the phase exists

**Example:**

```tsx
if (scheduler.hasPhase('physics')) {
  // Physics phase is available
}
```

---

### `phases` (getter)

Get the ordered list of phase names.

**Returns:** `string[]` - Array of phase names in execution order

**Example:**

```tsx
console.log(scheduler.phases)
// ['start', 'input', 'physics', 'update', 'render', 'finish']
```

---

## Root Management

Roots represent Canvas instances. The scheduler automatically manages roots when Canvas components mount/unmount.

### `registerRoot(id, options?)`

Register a root (Canvas) with the scheduler. The first root to register starts the RAF loop (if `frameloop='always'`).

**Parameters:**

- `id: string` - Unique identifier for this root
- `options?: RootOptions` - Optional configuration

**Options:**

```typescript
interface RootOptions {
  getState?: () => any // State provider for callbacks
  onError?: (error: Error) => void // Error handler (default: console.error)
}
```

**Returns:** `() => void` - Unsubscribe function to remove this root

**Example:**

```tsx
// Full R3F integration
const unsubscribe = scheduler.registerRoot('my-canvas', {
  getState: () => store.getState(),
  onError: (err) => store.getState().setError(err),
})

// Independent mode (no options needed)
scheduler.registerRoot('standalone')
```

**Notes:**

- Typically handled automatically by Canvas component
- First root starts the loop if `frameloop='always'`
- `onError` is used when job callbacks throw errors
- In independent mode, `getState` is optional
- Last root to unregister stops the loop

---

### `unregisterRoot(id)`

Unregister a root from the scheduler. Cleans up all job state listeners for this root's jobs.

**Parameters:**

- `id: string` - The root ID to unregister

**Example:**

```tsx
scheduler.unregisterRoot('my-canvas')
```

---

### `generateRootId()`

Generate a unique root ID for automatic root registration.

**Returns:** `string` - A unique root ID in the format `'root_N'`

**Example:**

```tsx
const rootId = scheduler.generateRootId()
// 'root_0'
```

---

### `getRootCount()`

Get the number of registered roots (Canvas instances).

**Returns:** `number` - Number of registered roots

**Example:**

```tsx
console.log(`Active canvases: ${scheduler.getRootCount()}`)
```

---

## Job Registration

Jobs are frame callbacks registered via `useFrame` or directly via the scheduler.

### `register(callback, options?)`

Register a job (frame callback) with a specific root. This is the core registration method used by `useFrame` internally.

**Parameters:**

- `callback: FrameNextCallback` - The function to call each frame
- `options?: JobOptions & { rootId?: string; system?: boolean }` - Job configuration

**Options:**

```typescript
interface JobOptions {
  id?: string // Unique job ID (auto-generated if not provided)
  rootId?: string // Target root ID (defaults to first root)
  phase?: string // Execution phase (defaults to 'update')
  before?: string | string[] // Run before this phase or job ID
  after?: string | string[] // Run after this phase or job ID
  priority?: number // Priority within phase (higher = earlier, default: 0)
  fps?: number // FPS throttle limit
  drop?: boolean // Drop frames when behind (default: true)
  enabled?: boolean // Whether job is active (default: true)
  system?: boolean // Internal flag for system jobs
}
```

**Returns:** `() => void` - Unsubscribe function to remove this job

**Examples:**

```tsx
// Basic registration
const unsub = scheduler.register((state, delta) => {
  console.log('Frame:', state.frame)
})

// With options
const unsub = scheduler.register(
  (state, delta) => {
    // Physics logic
  },
  {
    id: 'physics-sim',
    phase: 'physics',
    priority: 10,
    fps: 60,
  },
)

// Cleanup
unsub()
```

**Notes:**

- Duplicate IDs replace existing jobs with a warning
- If `before`/`after` specified without explicit `phase`, the phase is auto-resolved
- Jobs default to the `'update'` phase
- First registered job per root triggers a rebuild

---

### `unregister(id, rootId?)`

Unregister a job by its ID. Searches all roots if `rootId` is not provided.

**Parameters:**

- `id: string` - The job ID to unregister
- `rootId?: string` - Optional root ID to search

**Example:**

```tsx
scheduler.unregister('my-job-id')
```

---

### `updateJob(id, options)`

Update a job's options dynamically. Phase/constraint changes trigger a rebuild of the sorted job list.

**Parameters:**

- `id: string` - The job ID to update
- `options: Partial<JobOptions>` - The options to update

**Example:**

```tsx
// Change priority
scheduler.updateJob('my-job', { priority: 5 })

// Throttle to 30 FPS
scheduler.updateJob('my-job', { fps: 30, drop: true })

// Move to different phase
scheduler.updateJob('my-job', { phase: 'render' })

// Disable job
scheduler.updateJob('my-job', { enabled: false })
```

**Notes:**

- Searches all roots to find the job
- Priority, FPS, drop, and enabled are mutable without rebuild
- Phase, before, after changes trigger rebuild
- When re-enabling, job timing is reset to prevent frame accumulation

---

### `getJobCount()`

Get the total number of registered jobs across all roots.

**Returns:** `number` - Total job count (includes global before/after jobs)

**Example:**

```tsx
console.log(`Total jobs: ${scheduler.getJobCount()}`)
```

---

### `getJobIds()`

Get all registered job IDs across all roots.

**Returns:** `string[]` - Array of all job IDs (includes global before/after jobs)

**Example:**

```tsx
const allJobs = scheduler.getJobIds()
console.log('Registered jobs:', allJobs)
```

---

### `hasUserJobsInPhase(phase, rootId?)`

Check if any user (non-system) jobs are registered in a specific phase. Used internally to determine if users have taken over rendering.

**Parameters:**

- `phase: string` - The phase to check
- `rootId?: string` - Optional root ID to check (checks all roots if not provided)

**Returns:** `boolean` - `true` if any user jobs exist in the phase

**Example:**

```tsx
if (scheduler.hasUserJobsInPhase('render')) {
  console.log('User is handling rendering')
}
```

---

## Job State Management

### `isJobPaused(id)`

Check if a job is currently paused (disabled).

**Parameters:**

- `id: string` - The job ID to check

**Returns:** `boolean` - `true` if the job exists and is paused

**Example:**

```tsx
if (scheduler.isJobPaused('my-animation')) {
  console.log('Animation is paused')
}
```

---

### `pauseJob(id)`

Pause a job by ID (sets `enabled=false`). Notifies any subscribed state listeners.

**Parameters:**

- `id: string` - The job ID to pause

**Example:**

```tsx
scheduler.pauseJob('my-animation')
```

**Notes:**

- Job remains registered but won't execute
- Triggers rebuild of root's sorted job list
- Notifies listeners registered via `subscribeJobState`

---

### `resumeJob(id)`

Resume a paused job by ID (sets `enabled=true`). Resets job timing to prevent frame accumulation.

**Parameters:**

- `id: string` - The job ID to resume

**Example:**

```tsx
scheduler.resumeJob('my-animation')
```

**Notes:**

- Resets `lastRun` timing to prevent accumulated frames
- Triggers rebuild of root's sorted job list
- Notifies listeners registered via `subscribeJobState`

---

### `subscribeJobState(id, listener)`

Subscribe to state changes for a specific job. Listener is called when job is paused or resumed.

**Parameters:**

- `id: string` - The job ID to subscribe to
- `listener: () => void` - Callback invoked on state changes

**Returns:** `() => void` - Unsubscribe function

**Example:**

```tsx
const unsub = scheduler.subscribeJobState('my-job', () => {
  console.log('Job state changed')
})

// Later:
unsub()
```

**Notes:**

- Used internally by `useFrame` for reactive `isPaused` state
- Listener is called on `pauseJob` and `resumeJob`
- Multiple listeners can subscribe to the same job

---

## Frame Loop Control

### `start()`

Start the `requestAnimationFrame` loop. Resets timing state (elapsedTime, frameCount) on start.

**Example:**

```tsx
scheduler.start()
```

**Notes:**

- No-op if already running
- Adjusts `createdAt` if loop was previously stopped to maintain consistent elapsed time
- Automatically called when first root registers (if `frameloop='always'`)

---

### `stop()`

Stop the `requestAnimationFrame` loop. Cancels any pending RAF callback.

**Example:**

```tsx
scheduler.stop()
```

**Notes:**

- No-op if not running
- Records stop time for elapsed time calculations
- Automatically called when last root unregisters

---

### `isRunning` (getter)

Check if the scheduler loop is currently running.

**Returns:** `boolean` - `true` if loop is active

**Example:**

```tsx
if (scheduler.isRunning) {
  console.log('Scheduler is running')
}
```

---

### `frameloop` (getter/setter)

Get or set the frameloop mode. Controls how the scheduler runs.

**Type:** `'always' | 'demand' | 'never'`

**Modes:**

- `'always'` - Continuous rendering (default)
- `'demand'` - Render only when `invalidate()` is called
- `'never'` - Manual control via `step()` / `stepAll()`

**Example:**

```tsx
// Get current mode
console.log(scheduler.frameloop) // 'always'

// Set to demand mode
scheduler.frameloop = 'demand'

// Set to manual mode
scheduler.frameloop = 'never'
```

**Notes:**

- Switching from `'never'` or `'demand'` to `'always'` starts the loop
- Switching from `'always'` to other modes stops the loop
- Canvas `frameloop` prop sets this value

---

### `invalidate(frames?, stackFrames?)`

Request frames to be rendered in demand mode. Accumulates pending frames (capped at 60) and starts the loop if not running.

**Parameters:**

- `frames?: number` - Number of frames to request (default: `1`)
- `stackFrames?: boolean` - Whether to add frames to existing pending count (default: `false`)
  - `false`: Sets pending frames to the specified value (replaces existing count)
  - `true`: Adds frames to existing pending count (useful for accumulating invalidations)

**Examples:**

```tsx
// Request a single frame render
scheduler.invalidate()

// Request 5 frames (e.g., for animations)
scheduler.invalidate(5)

// Set pending frames to exactly 3 (don't stack with existing)
scheduler.invalidate(3, false)

// Add 2 more frames to existing pending count
scheduler.invalidate(2, true)
```

**Notes:**

- No-op if `frameloop` is not `'demand'`
- Capped at 60 pending frames maximum
- Starts the loop if not already running
- Each executed frame decrements pending count by 1
- Loop stops when pending count reaches 0, triggering `onIdle` callbacks

---

### `resetTiming()`

Reset timing state for deterministic testing. Preserves jobs and roots but resets `lastTime`, `frameCount`, `elapsedTime`, etc.

**Example:**

```tsx
scheduler.resetTiming()
```

**Notes:**

- Used primarily in tests
- Does not affect registered jobs or roots
- Does not stop/start the loop

---

## Manual Stepping

### `step(timestamp?)`

Manually execute a single frame for all roots. Useful for `frameloop='never'` mode or testing scenarios.

**Parameters:**

- `timestamp?: number` - Optional timestamp (defaults to `performance.now()`)

**Example:**

```tsx
// Manual control mode
scheduler.frameloop = 'never'
scheduler.step() // Execute one frame
```

**Notes:**

- Executes all enabled jobs in order
- Updates internal timing state
- Does not trigger RAF - purely synchronous
- Useful for tests and manual control scenarios

---

### `stepJob(id, timestamp?)`

Manually execute a single job by its ID. Useful for testing individual job callbacks in isolation.

**Parameters:**

- `id: string` - The job ID to step
- `timestamp?: number` - Optional timestamp (defaults to `performance.now()`)

**Example:**

```tsx
// Test a specific job
scheduler.stepJob('my-physics-sim')
```

**Notes:**

- Bypasses normal execution order
- Builds frame state as if running normally
- Does not update global timing state
- Logs warning if job not found

---

## Global Jobs (Deprecated)

These methods support the deprecated `addEffect` / `addAfterEffect` APIs. Use `useFrame` with phases instead.

### `registerGlobal(phase, id, callback)`

Register a global job that runs once per frame (not per-root).

**Parameters:**

- `phase: 'before' | 'after'` - When to run: `'before'` all roots or `'after'` all roots
- `id: string` - Unique identifier for this global job
- `callback: (timestamp: number) => void` - Function called each frame with RAF timestamp

**Returns:** `() => void` - Unsubscribe function

**Example:**

```tsx
const unsub = scheduler.registerGlobal('before', 'my-global', (timestamp) => {
  console.log('Global job', timestamp)
})

// Cleanup
unsub()
```

**⚠️ Deprecated:** Use `useFrame(callback, { phase: 'start' })` or `{ phase: 'finish' }` instead.

---

## Idle Callbacks (Deprecated)

### `onIdle(callback)`

Register an idle callback that fires when the loop stops. Used internally by deprecated `addTail` API.

**Parameters:**

- `callback: (timestamp: number) => void` - Function called when loop becomes idle

**Returns:** `() => void` - Unsubscribe function

**Example:**

```tsx
const unsub = scheduler.onIdle((timestamp) => {
  console.log('Loop stopped at', timestamp)
})

// Cleanup
unsub()
```

**Notes:**

- Only fires in `demand` mode when pending frames reach 0
- Multiple callbacks can be registered
- Callbacks run after the final frame, before loop stops

**⚠️ Deprecated:** Use demand mode with `invalidate()` instead.

---

## Advanced Usage

### Custom Phase Ordering

```tsx
import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'

function GameLoop() {
  const { scheduler } = useFrame()

  useEffect(() => {
    // Add custom phases between default phases
    scheduler.addPhase('ai', { after: 'physics', before: 'update' })
    scheduler.addPhase('postprocess', { after: 'render' })
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

---

### Multiple Canvas Support

The scheduler automatically manages multiple Canvas instances:

```tsx
function App() {
  return (
    <>
      <Canvas>
        {/* Jobs registered here use root 'root_0' */}
        <Scene1 />
      </Canvas>

      <Canvas>
        {/* Jobs registered here use root 'root_1' */}
        <Scene2 />
      </Canvas>
    </>
  )
}
```

Both canvases share the same RAF loop and phase system, but maintain separate job lists.

---

### Conditional Rendering Control

```tsx
function CustomRenderer() {
  const { scheduler } = useFrame()

  useFrame(
    (state, delta) => {
      // Custom render logic
      if (shouldRender()) {
        state.gl.render(state.scene, state.camera)
      }
    },
    { phase: 'render', id: 'custom-render' },
  )

  // The default renderer will be disabled because a user job exists in 'render' phase
  return null
}
```

---

### Testing with Manual Stepping

```tsx
import { getScheduler } from '@react-three/fiber'

describe('Animation System', () => {
  let scheduler

  beforeEach(() => {
    scheduler = getScheduler()
    scheduler.frameloop = 'never'
    scheduler.resetTiming()
  })

  test('physics simulation', () => {
    let position = 0

    scheduler.register(
      (state, delta) => {
        position += delta * 10
      },
      { id: 'test-physics', phase: 'physics' },
    )

    // Manually step 3 frames
    scheduler.step(0)
    scheduler.step(16.67) // ~60fps
    scheduler.step(33.34)

    expect(position).toBeCloseTo(0.333, 2)
  })

  afterEach(() => {
    scheduler.stop()
  })
})
```

---

## Performance Considerations

1. **Phase Organization** - Use phases to organize work logically rather than relying solely on priorities
2. **FPS Throttling** - Throttle expensive jobs to maintain smooth frame rates:
   ```tsx
   useFrame(expensiveWork, { fps: 30 })
   ```
3. **Conditional Execution** - Use `enabled` flag rather than early returns:
   ```tsx
   const enabled = useCondition()
   useFrame(callback, { enabled })
   ```
4. **Minimize Rebuilds** - Avoid frequently changing phase/priority as this triggers rebuilds
5. **Job Count** - Monitor job count in production via `scheduler.getJobCount()`

---

## Type Definitions

```typescript
// Core types
type Frameloop = 'always' | 'demand' | 'never'

interface FrameNextState extends RootState {
  time: number // High-res timestamp from RAF (ms)
  delta: number // Time since last frame (seconds)
  elapsed: number // Elapsed time since first frame (seconds)
  frame: number // Incrementing frame counter
}

type FrameNextCallback = (state: FrameNextState, delta: number) => void

// Options
interface UseFrameNextOptions {
  id?: string
  phase?: string
  before?: string | string[]
  after?: string | string[]
  priority?: number
  fps?: number
  drop?: boolean
  enabled?: boolean
}

interface AddPhaseOptions {
  before?: string
  after?: string
}
```

---

## Migration from Legacy APIs

### From `addEffect`

```tsx
// OLD ❌
import { addEffect } from '@react-three/fiber'
const unsub = addEffect((timestamp) => { ... })

// NEW ✅
import { useFrame } from '@react-three/fiber'
useFrame((state, delta) => { ... }, { phase: 'start' })
```

### From `addAfterEffect`

```tsx
// OLD ❌
import { addAfterEffect } from '@react-three/fiber'
const unsub = addAfterEffect((timestamp) => { ... })

// NEW ✅
import { useFrame } from '@react-three/fiber'
useFrame((state, delta) => { ... }, { phase: 'finish' })
```

### From `addTail`

```tsx
// OLD ❌
import { addTail } from '@react-three/fiber'
const unsub = addTail((timestamp) => { ... })

// NEW ✅
import { useFrame } from '@react-three/fiber'
const { scheduler } = useFrame()
const unsub = scheduler.onIdle((timestamp) => { ... })
```

---

## See Also

- [useFrame Hook Documentation](./useFrame.md)
- [Canvas API](https://docs.pmnd.rs/react-three-fiber/api/canvas)
- [Hooks Overview](https://docs.pmnd.rs/react-three-fiber/api/hooks)
