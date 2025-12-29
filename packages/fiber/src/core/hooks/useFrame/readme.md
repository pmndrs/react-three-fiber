# Frame Loop Documentation

Complete API reference and guides for react-three-fiber's frame loop system.

## 📚 Documentation

### Getting Started

- **[Frame Loop Overview](./readmes/frame-loop-overview.md)** - Architecture, patterns, and quick start guide

### API Reference

- **[useFrame Hook](./readmes/useFrame.md)** - Primary API for frame-based animations and updates
- **[Scheduler API](./readmes/scheduler.md)** - Deep dive into the global scheduler class
- **[Frame Loop Utilities](./readmes/frame-loop-api.md)** - Utility functions (`invalidate`, `advance`) and legacy API migration

## 🚀 Quick Links

| I want to...                   | Go to...                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| Animate on every frame         | [useFrame - Basic Usage](./readmes/useFrame.md#basic-usage)                          |
| Control execution order        | [useFrame - Phase-Based Ordering](./readmes/useFrame.md#phase-based-ordering)        |
| Throttle expensive operations  | [useFrame - FPS Throttling](./readmes/useFrame.md#fps-throttling)                    |
| Pause and resume animations    | [useFrame - Pause and Resume](./readmes/useFrame.md#pause-and-resume)                |
| Manually step frames (testing) | [useFrame - Manual Stepping](./readmes/useFrame.md#manual-stepping-frameloopnever)   |
| Render only on demand          | [Frame Loop Modes - Demand](./readmes/frame-loop-overview.md#frameloopdemand)        |
| Add custom execution phases    | [Scheduler - Phase Management](./readmes/scheduler.md#phase-management)              |
| Access the global scheduler    | [Scheduler - Getting Started](./readmes/scheduler.md#getting-the-scheduler-instance) |
| Migrate from `addEffect`       | [Frame Loop API - Migration](./readmes/frame-loop-api.md#migration-guide)            |
| Understand the architecture    | [Frame Loop Overview - Architecture](./readmes/frame-loop-overview.md#architecture)  |

## 📖 Examples

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

### Physics Before Updates

```tsx
function GameLoop() {
  // Physics runs first
  useFrame(
    (state, delta) => {
      physicsWorld.step(delta)
    },
    { phase: 'physics' },
  )

  // Game logic runs after
  useFrame((state, delta) => {
    updateGameState(delta)
  })

  return null
}
```

### Throttled Heavy Work

```tsx
function ParticleSystem() {
  useFrame(
    (state, delta) => {
      updateParticles() // Heavy operation
    },
    { fps: 30, drop: true },
  )

  return <points>{/* ... */}</points>
}
```

### Pause/Resume Control

```tsx
function PausableAnimation() {
  const controls = useFrame((state, delta) => {
    // Animation logic
  })

  return (
    <button onClick={() => (controls.isPaused ? controls.resume() : controls.pause())}>
      {controls.isPaused ? '▶ Resume' : '⏸ Pause'}
    </button>
  )
}
```

## 🏗️ System Architecture

```
requestAnimationFrame()
│
├── globalBefore jobs (deprecated)
│
├── Root 1 (Canvas)
│   ├── start phase
│   ├── input phase
│   ├── physics phase
│   ├── update phase (default)
│   ├── render phase
│   └── finish phase
│
├── Root 2 (Canvas)
│   └── [same phases]
│
├── globalAfter jobs (deprecated)
│
└── onIdle callbacks (demand mode)
```

## 🎯 Best Practices

1. **Use phases for ordering** - Instead of priority numbers, use named phases
2. **Throttle expensive work** - Use `fps` option for heavy computations
3. **Use `enabled` for conditionals** - Instead of early returns
4. **Name your jobs** - Use `id` option for better debugging
5. **Minimize re-registration** - Options changes cause re-registration

## 🔄 Migration from Legacy APIs

| Legacy API         | Modern Replacement                  |
| ------------------ | ----------------------------------- |
| `addEffect()`      | `useFrame(cb, { phase: 'start' })`  |
| `addAfterEffect()` | `useFrame(cb, { phase: 'finish' })` |
| `addTail()`        | `scheduler.onIdle(cb)`              |
| `invalidate()`     | ✅ Still valid (no changes)         |
| `advance()`        | ✅ Still valid (no changes)         |

See [Frame Loop API - Migration Guide](./readmes/frame-loop-api.md#migration-guide) for detailed examples.

## 🐛 Debugging

```tsx
const { scheduler } = useFrame()

// Inspect state
console.log('Phases:', scheduler.phases)
console.log('Job count:', scheduler.getJobCount())
console.log('Job IDs:', scheduler.getJobIds())
console.log('Running:', scheduler.isRunning)

// Named jobs for easier debugging
useFrame(callback, { id: 'my-animation' })
```

## 📝 Type Definitions

```typescript
// useFrame signature
function useFrame(
  callback?: (state: FrameState, delta: number) => void,
  options?: UseFrameOptions | number,
): FrameControls

// Options
interface UseFrameOptions {
  id?: string
  phase?: string
  before?: string | string[]
  after?: string | string[]
  priority?: number
  fps?: number
  drop?: boolean
  enabled?: boolean
}

// Controls
interface FrameControls {
  id: string
  scheduler: Scheduler
  step(timestamp?: number): void
  stepAll(timestamp?: number): void
  pause(): void
  resume(): void
  isPaused: boolean
}
```

## 📚 Related Documentation

- [Canvas API](https://docs.pmnd.rs/react-three-fiber/api/canvas)
- [Hooks Overview](https://docs.pmnd.rs/react-three-fiber/api/hooks)
- [Advanced Rendering](https://docs.pmnd.rs/react-three-fiber/advanced/scaling-performance)
