# useFrame and the New Scheduler

Content Type: Article
Status: Draft
Code Language: TypeScript

---

R3F v10 ships with a completely rewritten frame loop scheduler. for most - `useFrame(() => {})` works exactly the same. But for complex apps, we've added the control you've been hacking around.

## TL;DR - For 90% of folks nothing has changed.

```tsx
// Still works exactly the same
useFrame((state, delta) => {
  mesh.current.rotation.y += delta
})
```

Highlights:

- **Named phases** replace priority number guessing games
- **FPS throttling** built into individual jobs
- **Pause/resume controls** without state management overhead
- **Job dependencies** - make jobs run before/after other jobs by ID
- **Composable render control** - take over rendering without breaking everyone else
- **Manual stepping** for testing and debugging
- **Enabled flags** for conditional execution without frame-by-frame checks

## What’s a frame budget?

In any render or animation system we need a common animation/render loop for everything from handling input, to rendering sections with special post-processing effects. With 60fps becoming the standard rate we get about 16.7ms of a “work window” to do all our “work” with the expectation the final product will be the image on the screen, well before the end of the window.

So at the start of every Frame we “Start Working” and have some info handed to us about the state of the renderer, the world, and the previous frame. We know the time between when this job was started and when the last job was started which (hopefully) matches the 16.7ms we expect.

This window means we have to carefully plan the work we do, especially with the last half of it dedicated to the actual draw/render operations, this is our “Frame Budget”.

[image of a budget]

## How It Works: Jobs, Phases, and Frame Budgets

Every `useFrame` call registers a **Job** with the global scheduler. Each frame, the scheduler uses a single RAF loop (with its super acurate timestamp) and executes the jobs in the correct order.

The scheduler organizes jobs into **phases** - named execution stages that run in sequence:

```
Frame Budget (16.7ms)
├─ start phase    - Early setup, frame initialization
├─ input phase    - Input processing, event handling
├─ physics phase  - Physics simulation
├─ update phase   - Game logic, animations (default)
├─ render phase   - Custom rendering, effects
└─ finish phase   - Cleanup, stats, telemetry
```

This is a **DAG (Directed Acyclic Graph)** scheduler. Jobs define dependencies, phases, and constraints - the scheduler figures out the execution order. No more guessing with priority numbers.

## What We Fixed

### 1. Priority Numbers → Named Phases & Dependencies

**Old system:** Priority numbers that don't compose across libraries.

```tsx
// Library code you don't control
useFrame(libraryUpdate, 0)

// Your code - who runs first?
useFrame(physicsStep, 0)
```

**New system:** Named phases and explicit job dependencies.

```tsx
// Explicit phases
useFrame(physicsStep, { phase: 'physics' })
useFrame(controllerUpdate, { phase: 'update' })

// Or explicit job dependencies
useFrame(cameraMove, { id: 'camera' })
useFrame(followCamera, { after: 'camera' })
```

### 2. Manual Throttling → Built-in FPS Limiting

**Old system:** Manual frame timing logic in every job.

```tsx
const lastRun = useRef(0)
useFrame((state) => {
  if (state.clock.elapsedTime - lastRun.current < 1 / 30) return
  lastRun.current = state.clock.elapsedTime
  expensiveWork()
})
```

**New system:** FPS throttling per job. Spread expensive work across your frame budget.

```tsx
useFrame(expensiveAI, { fps: 30 })
useFrame(heavyPhysics, { fps: 60 })
useFrame(particleUpdate, { fps: 20 })
```

### 3. Render Takeover → Composable Render Phase

**Old system:** Taking control of rendering breaks everyone else.

```tsx
// Your HUD now owns the ENTIRE render loop
useFrame(({ gl, scene, camera }) => {
  gl.render(scene, camera) // Controls everything
  gl.autoClear = false
  gl.render(hudScene, hudCamera)
  gl.autoClear = true
}, 1)
```

**New system:** Use `phase: 'render'` or `after: 'render'` to compose render jobs.

```tsx
// Default render still happens
useFrame(
  ({ gl }) => {
    gl.autoClear = false
    gl.render(hudScene, hudCamera)
    gl.autoClear = true
  },
  { after: 'render' },
)
```

### 4. State Checks → Job Controls

**Old system:** Check paused state every frame, pass state through props.

```tsx
const [paused, setPaused] = useState(false)

useFrame((state, delta) => {
  if (paused) return // Wastes frame budget checking
  doWork()
})
```

**New system:** Control jobs directly without wasting frame budget.

```tsx
// Job exposes controls
const { pause, resume, isPaused } = useFrame(doWork)
<button onClick={pause}>Pause</button>

// Or control from anywhere by ID
const { scheduler } = useThree()
scheduler.pauseJob('animation-id')

// Or use enabled flag - job doesn't execute at all
const isActive = useGameState()
useFrame(doWork, { enabled: isActive })
```

## Core Concepts in Practice

### Default Phase: Update

Most work goes in the `update` phase by default:

```tsx
useFrame(() => {
  // Runs in 'update' phase
})

// Explicit (same as above)
useFrame(() => {}, { phase: 'update' })
```

### Organizing Work with Phases

When you're building a game loop, organize work by type:

```tsx
// Input handling runs first
useFrame(processInput, { phase: 'input' })

// Physics simulation runs after input
useFrame(() => world.step(1 / 60), { phase: 'physics' })

// Game logic runs after physics
useFrame(updateGameState, { phase: 'update' })

// Custom rendering runs after updates
useFrame(renderEffects, { phase: 'render' })

// Stats and cleanup run last
useFrame(recordStats, { phase: 'finish' })
```

### Adding Custom Phases

When you need finer control than the default phases provide:

```tsx
const { scheduler } = useThree()

useEffect(() => {
  // Add 'ai' phase between physics and update
  scheduler.addPhase('ai', { after: 'physics', before: 'update' })
}, [])

// Use your custom phase
useFrame(aiSystemUpdate, { phase: 'ai' })
```

### Before/After: Implicit Phases

Don't want to explicitly add phases? Use `before` and `after` to create implicit ordering:

```tsx
// Runs in auto-generated 'before:render' phase
useFrame(prepRenderTargets, { before: 'render' })

// Runs in auto-generated 'after:render' phase
useFrame(copyToHUD, { after: 'render' })
```

This keeps the default render job intact - your work happens around it, not instead of it.

## Job Dependencies

Every `useFrame` call creates a job with a unique ID. Reference jobs by ID to create hard dependencies:

```tsx
// Camera update runs first
useFrame(updateCamera, { id: 'camera' })

// Character follows camera - runs after camera job
useFrame(updateCharacter, { after: 'camera' })

// Enemies need to see character position - run after character
useFrame(updateEnemies, { after: 'character', id: 'enemies' })
```

Jobs automatically get IDs if you don't provide them:

```tsx
const { id } = useFrame(doWork)
console.log(id) // Auto-generated ID like ':r1:'
```

### Multiple Dependencies

Jobs can depend on multiple other jobs or phases:

```tsx
// Run after both physics AND input are done
useFrame(updateCharacter, { after: ['physics', 'input'] })

// Run before multiple things
useFrame(earlySetup, { before: ['physics', 'update'] })
```

## Job Controls

Jobs return control handles for pause/resume/stepping:

```tsx
function PausableEffect() {
  const controls = useFrame(
    (state, delta) => {
      // Animation work
    },
    { id: 'particle-system' },
  )

  return (
    <button onClick={() => (controls.isPaused ? controls.resume() : controls.pause())}>
      {controls.isPaused ? 'Resume' : 'Pause'}
    </button>
  )
}
```

### Control Jobs from Anywhere

Access the scheduler from any component to control jobs by ID:

```tsx
function DebugPanel() {
  const { scheduler } = useThree()

  return (
    <div>
      <button onClick={() => scheduler.pauseJob('particle-system')}>Pause Particles</button>
      <button onClick={() => scheduler.resumeJob('particle-system')}>Resume Particles</button>
    </div>
  )
}
```

### Enabled Flag vs Pause

For conditional execution, use the `enabled` option instead of early returns:

```tsx
// ❌ Bad: Job runs every frame just to bail out
const [active, setActive] = useState(true)
useFrame(() => {
  if (!active) return
  doWork()
})

// ✅ Good: Job doesn't execute at all when disabled
const [active, setActive] = useState(true)
useFrame(doWork, { enabled: active })
```

The job stays registered but the scheduler skips it entirely when `enabled: false`. No wasted frame budget.

## FPS Throttling and Frame Budget Management

Not all work needs to run at 60fps. Expensive operations can run slower without impacting visual quality:

```tsx
// Heavy work at 30fps
useFrame(expensiveAI, { fps: 30 })

// Medium work at 40fps
useFrame(particlePhysics, { fps: 40 })

// Lightweight work every frame
useFrame(smoothAnimation)
```

This lets you spread expensive work across your frame budget instead of cramming everything into every frame.

### Drop vs Catch-up Semantics

When a throttled job misses its window, you can choose how to handle it:

**Drop mode (default):** Skip missed frames - good for visual updates

```tsx
useFrame(updateUI, { fps: 30, drop: true })
// If we're behind, skip the missed frames
```

**Catch-up mode:** Try to catch up on missed frames - good for simulations

```tsx
useFrame(physicsStep, { fps: 60, drop: false })
// If we're behind, run multiple times to catch up
```

### Managing Frame Budget

At 60fps, you have ~16.7ms to do all your work. Organize and throttle jobs to stay within budget:

```tsx
function GameLoop() {
  // Time-critical work - every frame
  useFrame(handleInput, { phase: 'input' })
  useFrame(renderScene, { phase: 'render' })

  // Medium priority - 60fps is enough
  useFrame(() => physicsWorld.step(1 / 60), { phase: 'physics', fps: 60 })

  // Heavy work - can run slower
  useFrame(aiDecisions, { fps: 20 })
  useFrame(proceduralGen, { fps: 10 })

  return null
}
```

On high refresh rate displays (120Hz, 144Hz), your render can run faster while keeping expensive work throttled.

## Frameloop Modes

Control how the scheduler runs with the Canvas `frameloop` prop:

### `frameloop="always"` (default)

Continuous rendering - jobs run every frame via RAF:

```tsx
<Canvas frameloop="always">
  <Scene />
</Canvas>
```

### `frameloop="demand"`

Render only when explicitly invalidated - good for static scenes:

```tsx
;<Canvas frameloop="demand">
  <StaticScene />
</Canvas>

function StaticScene() {
  const { invalidate } = useThree()

  const handleUpdate = () => {
    updateSomething()
    invalidate() // Request one frame
  }

  return <mesh onClick={handleUpdate} />
}
```

### `frameloop="never"`

Manual control - advance frames manually for testing or non-realtime rendering:

```tsx
;<Canvas frameloop="never">
  <DebugScene />
</Canvas>

function DebugScene() {
  const { advance } = useFrame()

  return <button onClick={() => advance()}>Step Frame</button>
}
```

### Changing Frameloop at Runtime

```tsx
const { scheduler, setFrameloop } = useThree()

// Old API (still works)
setFrameloop('demand')

// Direct access
scheduler.frameloop = 'always'
```

## Accessing the Scheduler

Multiple ways to get scheduler access:

```tsx
// From useThree
const { scheduler } = useThree()

// From useFrame
const { scheduler } = useFrame()

// In frame callback
useFrame(({ scheduler }) => {
  // Use scheduler
})

// Global access (outside React)
import { getScheduler } from '@react-three/fiber'
const scheduler = getScheduler()
```

## Taking Over the Render Loop

By default, R3F automatically renders your scene. When you need custom rendering (post-processing, multi-pass, portals), you have full control:

### Default Behavior

```tsx
// R3F automatically renders after all 'update' phase jobs
useFrame((state, delta) => {
  // Animation logic - render happens automatically
})
```

### Taking Over Rendering

Register ANY job in the `render` phase to take over rendering completely:

```tsx
// You now control rendering
useFrame(
  (state, delta) => {
    effectComposer.render()
  },
  { phase: 'render' },
)

// Default render is disabled when any job uses phase: 'render'
```

### Composable Rendering

Use `before` or `after` to add rendering work without taking over:

```tsx
// Run BEFORE default render
useFrame(
  (state) => {
    // Prep render targets, update uniforms, etc.
  },
  { before: 'render' },
)
// Default render still happens

// Run AFTER default render
useFrame(
  ({ gl }) => {
    // Additional render passes, HUD overlays, etc.
    gl.autoClear = false
    gl.render(hudScene, hudCamera)
    gl.autoClear = true
  },
  { after: 'render' },
)
// Default render already happened
```

This makes render extensions composable - multiple components can add rendering work without conflicts.

## Real World Example: Game Loop

Putting it all together:

```tsx
function GameLoop() {
  const { scheduler } = useThree()

  // Add custom AI phase
  useEffect(() => {
    scheduler.addPhase('ai', { after: 'physics', before: 'update' })
  }, [])

  // Input runs first
  useFrame(processInput, {
    phase: 'input',
    id: 'input-handler',
  })

  // Physics at 60fps
  useFrame(() => physicsWorld.step(1 / 60), {
    phase: 'physics',
    fps: 60,
    drop: false, // Catch up if behind
  })

  // AI at 20fps
  useFrame(aiSystemUpdate, {
    phase: 'ai',
    fps: 20,
    drop: true, // Skip if behind
  })

  // Game state updates every frame
  useFrame(updateGameState, {
    phase: 'update',
    id: 'game-state',
  })

  // Visual effects depend on game state
  useFrame(updateVFX, {
    after: 'game-state',
  })

  // HUD renders after main scene
  useFrame(
    ({ gl }) => {
      gl.autoClear = false
      gl.render(hudScene, hudCamera)
      gl.autoClear = true
    },
    { after: 'render' },
  )

  // Stats collection at the end
  useFrame(collectStats, { phase: 'finish' })

  return null
}
```

## Migration from Priority Numbers

If you're using priority-based ordering:

```tsx
// Old
useFrame(callback, -1) // Runs early
useFrame(callback, 0) // Default
useFrame(callback, 1) // Runs late

// New - use phases or dependencies
useFrame(callback, { phase: 'input' }) // Runs early
useFrame(callback, { phase: 'update' }) // Default
useFrame(callback, { phase: 'finish' }) // Runs late

// Or explicit dependencies
useFrame(callback1, { id: 'first' })
useFrame(callback2, { after: 'first' })
```

Priority numbers still work for backwards compatibility, but phases are clearer and more maintainable.

## What's Next

This article covers the key features. For complete API details:

- **[useFrame API Documentation](./useFrame.md)** - Full options, return values, and examples
- **[Scheduler API Documentation](./scheduler.md)** - Deep dive into the scheduler class and advanced control
- **[Frame Loop Overview](./frame-loop-overview.md)** - Architecture, patterns, and best practices
- **[Frame Loop Utilities](./frame-loop-api.md)** - `invalidate`, `advance`, and migration guides

The new scheduler gives you the control you need for complex apps while staying simple for basic use. Frame budget management, job dependencies, and composable rendering - all without breaking existing code.
