# Frame Loop System Overview

React-three-fiber's frame loop system provides a powerful, flexible way to execute code on every frame. This overview will help you understand the architecture and navigate the documentation.

## Documentation Structure

### 📖 Core Documentation

1. **[useFrame Hook](./useFrame.md)** - Primary API for frame-based animations

   - Basic usage and examples
   - Options and controls
   - Phase-based ordering
   - FPS throttling
   - Pause/resume functionality
   - Best practices

2. **[Scheduler API](./scheduler.md)** - Deep dive into the global scheduler

   - Complete API reference
   - Phase management
   - Root registration
   - Job control methods
   - Manual stepping
   - Advanced usage patterns

3. **[Frame Loop Utilities](./frame-loop-api.md)** - Utility functions and legacy APIs
   - `invalidate()` for demand mode
   - `advance()` for manual stepping
   - Migration guide from legacy APIs
   - Type definitions

---

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

// Custom rendering runs after updates
useFrame(
  (state, delta) => {
    customRenderer.render(state.scene, state.camera)
  },
  { phase: 'render' },
)
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

The frame loop system consists of three main components:

### 1. Global Scheduler

A singleton class that manages the RAF loop for the entire application.

**Key Features:**

- Single `requestAnimationFrame` loop
- Multi-root support (multiple Canvas instances)
- Phase-based execution order
- Priority sorting within phases
- Job management and state tracking

**Execution Order:**

```
requestAnimationFrame()
├── globalBefore jobs (deprecated addEffect)
├── For each root (Canvas):
│   ├── start phase
│   ├── input phase
│   ├── physics phase
│   ├── update phase (default)
│   ├── render phase
│   └── finish phase
├── globalAfter jobs (deprecated addAfterEffect)
└── onIdle callbacks (demand mode)
```

See: [Scheduler API Documentation](./scheduler.md)

---

### 2. useFrame Hook

A React hook that registers frame callbacks with the scheduler.

**Key Features:**

- Full access to root state (gl, scene, camera, etc.)
- Delta time in seconds for convenience
- Pause/resume functionality
- FPS throttling per job
- Reactive state management
- Phase-based and priority-based ordering

**Return Value:**

```typescript
interface FrameControls {
  id: string // Job ID
  scheduler: Scheduler // Scheduler instance
  step(timestamp?): void // Manual stepping
  stepAll(timestamp?): void // Step all jobs
  pause(): void // Pause this job
  resume(): void // Resume this job
  isPaused: boolean // Reactive pause state
}
```

See: [useFrame Documentation](./useFrame.md)

---

### 3. Phase System

Organizes frame work into named execution stages.

**Default Phases:**

1. `start` - Early frame setup, input capture
2. `input` - Input processing
3. `physics` - Physics simulation
4. `update` - General updates (default)
5. `render` - Custom rendering logic
6. `finish` - Frame cleanup, stats

**Custom Phases:**

```tsx
const { scheduler } = useFrame()

// Add custom phase
scheduler.addPhase('ai', { after: 'physics', before: 'update' })

// Use custom phase
useFrame(callback, { phase: 'ai' })
```

**Auto-generated Phases:**

When using `before`/`after` constraints without explicit phases, the system auto-generates phases:

```tsx
// Creates 'before:render' phase automatically
useFrame(callback, { before: 'render' })

// Creates 'after:physics' phase automatically
useFrame(callback, { after: 'physics' })
```

---

## Frame Loop Modes

Control how the scheduler runs via the Canvas `frameloop` prop:

### `frameloop="always"` (default)

Continuous rendering - callbacks run every animation frame.

```tsx
<Canvas frameloop="always">
  <Scene />
</Canvas>
```

**Use Cases:**

- Interactive 3D applications
- Continuous animations
- Real-time simulations

---

### `frameloop="demand"`

Render only when `invalidate()` is called. Good for static scenes with occasional updates.

```tsx
import { invalidate } from '@react-three/fiber'
;<Canvas frameloop="demand">
  <StaticScene />
</Canvas>

function StaticScene() {
  const handleClick = () => {
    // Update something
    updateState()
    // Request a frame
    invalidate()
  }

  return <mesh onClick={handleClick} />
}
```

**Use Cases:**

- Static scenes (CAD viewers, product configurators)
- Battery-conscious mobile apps
- Editor tools with explicit update triggers

**Idle Callbacks:**

```tsx
const { scheduler } = useFrame()

useEffect(() => {
  const unsub = scheduler.onIdle((timestamp) => {
    console.log('Rendering stopped')
    saveState()
  })
  return unsub
}, [scheduler])
```

---

### `frameloop="never"`

Manual control - use `step()` or `stepAll()` to advance frames.

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

**Use Cases:**

- Testing and debugging
- Frame-by-frame animation tools
- Non-real-time rendering
- Deterministic playback

---

## Common Patterns

### Multi-Stage Processing

```tsx
function GameLoop() {
  // 1. Handle input
  useFrame(
    (state, delta) => {
      processInput()
    },
    { phase: 'input', priority: 10 },
  )

  // 2. Run physics
  useFrame(
    (state, delta) => {
      physicsWorld.step(delta)
    },
    { phase: 'physics' },
  )

  // 3. Update game logic
  useFrame(
    (state, delta) => {
      updateGameState(delta)
    },
    { phase: 'update' },
  )

  // 4. Sync visuals to physics
  useFrame(
    (state, delta) => {
      syncPhysicsToGraphics()
    },
    { phase: 'update', priority: -10 },
  )

  return null
}
```

---

### Conditional Execution

```tsx
function ConditionalWork() {
  const [enabled, setEnabled] = useState(true)

  useFrame(
    (state, delta) => {
      // This only runs when enabled=true
      doWork()
    },
    { enabled },
  )

  return <button onClick={() => setEnabled(!enabled)}>{enabled ? 'Disable' : 'Enable'}</button>
}
```

---

### Performance Optimization

```tsx
function OptimizedWork() {
  // Heavy work at 30 FPS
  useFrame(
    (state, delta) => {
      heavyComputation()
    },
    { fps: 30, drop: true },
  )

  // Time-critical work at 60 FPS with catch-up
  useFrame(
    (state, delta) => {
      physicsSimulation(1 / 60)
    },
    { fps: 60, drop: false },
  )

  // Lightweight work every frame
  useFrame((state, delta) => {
    lightUpdate()
  })
}
```

---

### Testing Support

```tsx
import { getScheduler, advance } from '@react-three/fiber'

describe('Animation System', () => {
  beforeEach(() => {
    const scheduler = getScheduler()
    scheduler.frameloop = 'never'
    scheduler.resetTiming()
  })

  test('animation progresses correctly', () => {
    let value = 0

    getScheduler().register((state, delta) => {
      value += delta
    })

    // Step 3 frames at 60 FPS
    advance(0)
    advance(16.67)
    advance(33.34)

    expect(value).toBeCloseTo(0.033, 2)
  })
})
```

---

## Performance Considerations

### 1. Job Count

Monitor active jobs in production:

```tsx
const { scheduler } = useFrame()
console.log(`Active jobs: ${scheduler.getJobCount()}`)
```

**Best Practices:**

- Clean up jobs when components unmount (hooks do this automatically)
- Use `enabled: false` instead of conditionally rendering components
- Minimize job churn (avoid frequent registration/unregistration)

---

### 2. Phase Organization

```tsx
// ❌ Bad: Everything in default phase with priorities
useFrame(callback1, { priority: 100 })
useFrame(callback2, { priority: 50 })
useFrame(callback3, { priority: 10 })

// ✅ Good: Organized into logical phases
useFrame(callback1, { phase: 'input' })
useFrame(callback2, { phase: 'physics' })
useFrame(callback3, { phase: 'update' })
```

**Benefits:**

- Clearer intent
- Better debugging
- Easier to reason about execution order
- More maintainable codebase

---

### 3. FPS Throttling

```tsx
// ❌ Bad: Expensive work every frame
useFrame((state, delta) => {
  expensiveAIComputation() // Runs at 60+ FPS
  heavyParticleUpdate() // Runs at 60+ FPS
})

// ✅ Good: Throttle expensive operations
useFrame(expensiveAIComputation, { fps: 20 })
useFrame(heavyParticleUpdate, { fps: 30 })
useFrame(lightweightUpdate) // Runs every frame
```

---

### 4. Conditional Execution

```tsx
// ❌ Bad: Early return (job still runs)
useFrame((state, delta) => {
  if (!condition) return
  doWork()
})

// ✅ Good: Disable job entirely
useFrame(doWork, { enabled: condition })
```

**Benefits:**

- Job doesn't execute at all when disabled
- Better for debugging and profiling
- Clearer intent

---

## Migration from Legacy APIs

### addEffect / addAfterEffect

```tsx
// ❌ OLD (deprecated)
import { addEffect, addAfterEffect } from '@react-three/fiber'

const unsub1 = addEffect((timestamp) => {
  console.log('before')
})

const unsub2 = addAfterEffect((timestamp) => {
  console.log('after')
})

// ✅ NEW
import { useFrame } from '@react-three/fiber'

function FrameLogic() {
  useFrame(
    (state, delta) => {
      console.log('before')
    },
    { phase: 'start' },
  )

  useFrame(
    (state, delta) => {
      console.log('after')
    },
    { phase: 'finish' },
  )

  return null
}
```

**Benefits of Migration:**

- Access to full root state
- Delta in seconds (THREE.Clock compatible)
- Better React integration
- TypeScript support

See: [Frame Loop API - Migration Guide](./frame-loop-api.md#migration-guide)

---

## Debugging Tips

### 1. Name Your Jobs

```tsx
useFrame(callback, { id: 'player-animation' })
```

Named jobs are easier to find in dev tools and logs.

---

### 2. Log Execution Order

```tsx
useFrame(
  (state) => {
    console.log('start', state.frame)
  },
  { phase: 'start' },
)

useFrame(
  (state) => {
    console.log('update', state.frame)
  },
  { phase: 'update' },
)

useFrame(
  (state) => {
    console.log('finish', state.frame)
  },
  { phase: 'finish' },
)
```

---

### 3. Inspect Scheduler State

```tsx
const { scheduler } = useFrame()

console.log('Phases:', scheduler.phases)
console.log('Jobs:', scheduler.getJobIds())
console.log('Roots:', scheduler.getRootCount())
console.log('Running:', scheduler.isRunning)
```

---

### 4. Monitor Frame Timing

```tsx
function FrameTiming() {
  const startRef = useRef(0)

  useFrame(
    () => {
      startRef.current = performance.now()
    },
    { phase: 'start' },
  )

  useFrame(
    () => {
      const frameTime = performance.now() - startRef.current
      if (frameTime > 16.67) {
        console.warn(`Slow frame: ${frameTime.toFixed(2)}ms`)
      }
    },
    { phase: 'finish' },
  )

  return null
}
```

---

## Resources

- **[useFrame Hook](./useFrame.md)** - Complete hook documentation
- **[Scheduler API](./scheduler.md)** - Scheduler class reference
- **[Frame Loop Utilities](./frame-loop-api.md)** - Utility functions and migration
- **[Canvas API](https://docs.pmnd.rs/react-three-fiber/api/canvas)** - Canvas props including `frameloop`
- **[Examples](https://docs.pmnd.rs/react-three-fiber/examples)** - Code examples and demos
