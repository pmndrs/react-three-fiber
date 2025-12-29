# Frame Loop Utility Functions

This document covers utility functions for frame loop control, including legacy APIs and their modern replacements.

## Table of Contents

- [Modern APIs](#modern-apis)
  - [invalidate()](#invalidate)
  - [advance()](#advance)
- [Legacy APIs (Deprecated)](#legacy-apis-deprecated)
  - [addEffect()](#addeffect)
  - [addAfterEffect()](#addaftereffect)
  - [addTail()](#addtail)
- [Migration Guide](#migration-guide)

---

## Modern APIs

These functions are the current, supported way to control the frame loop programmatically.

### `invalidate()`

Request frames to be rendered in demand mode. This is the primary way to trigger rendering when using `frameloop="demand"`.

**Signature:**

```typescript
function invalidate(state?: RootState, frames?: number, stackFrames?: boolean): void
```

**Parameters:**

| Parameter     | Type        | Default | Description                                                                 |
| ------------- | ----------- | ------- | --------------------------------------------------------------------------- |
| `state`       | `RootState` | -       | Optional root state (ignored, kept for backwards compatibility)             |
| `frames`      | `number`    | `1`     | Number of frames to request                                                 |
| `stackFrames` | `boolean`   | `false` | If `false`, sets pending frames. If `true`, adds to existing pending frames |

**Examples:**

```tsx
import { invalidate } from '@react-three/fiber'

// Request a single frame
invalidate()

// Request 5 frames (useful for short animations)
invalidate(undefined, 5)

// Add 2 more frames to existing pending count
invalidate(undefined, 2, true)
```

**Usage in Components:**

```tsx
import { useThree } from '@react-three/fiber'

function InteractiveObject() {
  const { invalidate } = useThree()

  const handleClick = () => {
    // Update state and request a frame
    updateSomeState()
    invalidate()
  }

  return <mesh onClick={handleClick} />
}
```

**Notes:**

- Only works when `frameloop="demand"`
- Pending frames are capped at 60 maximum
- Each rendered frame decrements the pending count by 1
- When pending count reaches 0, the loop stops and `onIdle` callbacks fire
- Internally delegates to `scheduler.invalidate(frames, stackFrames)`

---

### `advance()`

Manually advance the frameloop and run all registered effects. Useful for `frameloop="never"` mode or testing.

**Signature:**

```typescript
function advance(timestamp: number, runGlobalEffects?: boolean, state?: RootState, frame?: XRFrame): void
```

**Parameters:**

| Parameter          | Type        | Default | Description                                                    |
| ------------------ | ----------- | ------- | -------------------------------------------------------------- |
| `timestamp`        | `number`    | -       | The timestamp to use for this frame (milliseconds)             |
| `runGlobalEffects` | `boolean`   | `true`  | Ignored (kept for backwards compat, global effects always run) |
| `state`            | `RootState` | -       | Ignored (kept for backwards compatibility)                     |
| `frame`            | `XRFrame`   | -       | Ignored (kept for backwards compatibility)                     |

**Examples:**

```tsx
import { advance } from '@react-three/fiber'

// Manual frame stepping
advance(performance.now())

// Advance with specific timestamp
advance(1000.5)
```

**Usage with Manual Control:**

```tsx
function ManualController() {
  const handleStep = () => {
    advance(performance.now())
  }

  return (
    <Canvas frameloop="never">
      <Scene />
      <button onClick={handleStep}>Step Frame</button>
    </Canvas>
  )
}
```

**Testing Example:**

```tsx
import { advance } from '@react-three/fiber'

describe('Animation', () => {
  test('advances over time', () => {
    let position = 0

    // Register animation
    const unsub = useFrame((state, delta) => {
      position += delta
    })

    // Manually advance 3 frames at 60 FPS
    advance(0)
    advance(16.67)
    advance(33.34)

    expect(position).toBeCloseTo(0.033, 2)
  })
})
```

**Notes:**

- Executes all registered jobs in order (respecting phases and priorities)
- Updates internal timing state (`lastTime`, `frameCount`, `elapsed`)
- Does not trigger `requestAnimationFrame` - purely synchronous
- Internally delegates to `scheduler.step(timestamp)`
- Global effects (deprecated `addEffect`/`addAfterEffect`) always run regardless of `runGlobalEffects` parameter

---

## Legacy APIs (Deprecated)

These functions are deprecated and will be removed in a future version. They are documented here for reference and migration purposes.

### `addEffect()`

**⚠️ Deprecated:** Use `useFrame(callback, { phase: 'start' })` instead.

Adds a global render callback which is called each frame **before** rendering all roots.

**Signature:**

```typescript
function addEffect(callback: (timestamp: number) => void): () => void
```

**Parameters:**

| Parameter  | Type                          | Description                                                  |
| ---------- | ----------------------------- | ------------------------------------------------------------ |
| `callback` | `(timestamp: number) => void` | Function called each frame with RAF timestamp (milliseconds) |

**Returns:** `() => void` - Unsubscribe function to remove this effect

**Example (Deprecated):**

```tsx
import { addEffect } from '@react-three/fiber'

// ❌ OLD (deprecated)
const unsub = addEffect((timestamp) => {
  console.log('Before rendering:', timestamp)
})

// Cleanup
unsub()
```

**Migration to Modern API:**

```tsx
import { useFrame } from '@react-three/fiber'

// ✅ NEW
function EarlyFrameLogic() {
  useFrame(
    (state, delta) => {
      console.log('Before rendering:', state.time)
    },
    { phase: 'start' },
  )

  return null
}
```

**Notes:**

- Runs once per frame, not per-root
- Runs before all root jobs execute
- Cannot access root state (no `gl`, `scene`, `camera`, etc.)
- Receives only raw RAF timestamp
- Internally uses `scheduler.registerGlobal('before', id, callback)`

---

### `addAfterEffect()`

**⚠️ Deprecated:** Use `useFrame(callback, { phase: 'finish' })` instead.

Adds a global after-render callback which is called each frame **after** rendering all roots.

**Signature:**

```typescript
function addAfterEffect(callback: (timestamp: number) => void): () => void
```

**Parameters:**

| Parameter  | Type                          | Description                                                  |
| ---------- | ----------------------------- | ------------------------------------------------------------ |
| `callback` | `(timestamp: number) => void` | Function called each frame with RAF timestamp (milliseconds) |

**Returns:** `() => void` - Unsubscribe function to remove this effect

**Example (Deprecated):**

```tsx
import { addAfterEffect } from '@react-three/fiber'

// ❌ OLD (deprecated)
const unsub = addAfterEffect((timestamp) => {
  console.log('After rendering:', timestamp)
})

// Cleanup
unsub()
```

**Migration to Modern API:**

```tsx
import { useFrame } from '@react-three/fiber'

// ✅ NEW
function LateFrameLogic() {
  useFrame(
    (state, delta) => {
      console.log('After rendering:', state.time)
    },
    { phase: 'finish' },
  )

  return null
}
```

**Notes:**

- Runs once per frame, not per-root
- Runs after all root jobs execute
- Cannot access root state (no `gl`, `scene`, `camera`, etc.)
- Receives only raw RAF timestamp
- Useful for cleanup, stats collection, debugging
- Internally uses `scheduler.registerGlobal('after', id, callback)`

---

### `addTail()`

**⚠️ Deprecated:** Use `scheduler.onIdle(callback)` instead.

Adds a global callback which is called when rendering stops (idle state).

**Signature:**

```typescript
function addTail(callback: (timestamp: number) => void): () => void
```

**Parameters:**

| Parameter  | Type                          | Description                          |
| ---------- | ----------------------------- | ------------------------------------ |
| `callback` | `(timestamp: number) => void` | Function called when rendering stops |

**Returns:** `() => void` - Unsubscribe function to remove this callback

**Example (Deprecated):**

```tsx
import { addTail } from '@react-three/fiber'

// ❌ OLD (deprecated)
const unsub = addTail((timestamp) => {
  console.log('Rendering stopped at:', timestamp)
})

// Cleanup
unsub()
```

**Migration to Modern API:**

```tsx
import { useFrame } from '@react-three/fiber'

// ✅ NEW
function IdleHandler() {
  const { scheduler } = useFrame()

  useEffect(() => {
    const unsub = scheduler.onIdle((timestamp) => {
      console.log('Rendering stopped at:', timestamp)
    })

    return unsub
  }, [scheduler])

  return null
}
```

**Notes:**

- Only fires in `demand` mode when pending frames reach 0
- Multiple callbacks can be registered
- Callbacks run after the final frame, before the loop stops
- Useful for cleanup, saving state, triggering side effects
- Internally uses `scheduler.onIdle(callback)`

---

## Migration Guide

### Quick Reference

| Legacy API           | Modern Replacement                      |
| -------------------- | --------------------------------------- |
| `addEffect(cb)`      | `useFrame(cb, { phase: 'start' })`      |
| `addAfterEffect(cb)` | `useFrame(cb, { phase: 'finish' })`     |
| `addTail(cb)`        | `scheduler.onIdle(cb)` via `useFrame()` |
| `invalidate()`       | Still valid ✅ (no changes needed)      |
| `advance(timestamp)` | Still valid ✅ (no changes needed)      |

---

### Why Migrate?

**Benefits of modern `useFrame` API:**

1. **Access to full state** - Get `gl`, `scene`, `camera`, and all root properties
2. **Delta time** - Convenient access to frame delta in seconds
3. **Better integration** - Works seamlessly with React lifecycle
4. **Type safety** - Full TypeScript support with state typing
5. **Pause/resume** - Built-in controls for job management
6. **FPS throttling** - Per-job performance optimization
7. **Phase system** - Clear execution ordering

**Drawbacks of legacy APIs:**

1. ❌ No access to root state
2. ❌ Global scope only (can't be per-Canvas)
3. ❌ Timestamp in milliseconds (inconsistent with THREE.Clock's seconds)
4. ❌ No pause/resume functionality
5. ❌ No FPS throttling
6. ❌ Harder to test

---

### Migration Examples

#### Example 1: Stats Collection

**Before (Legacy):**

```tsx
import { addEffect, addAfterEffect } from '@react-three/fiber'

let frameStart = 0

// Before frame
const unsub1 = addEffect((timestamp) => {
  frameStart = performance.now()
})

// After frame
const unsub2 = addAfterEffect((timestamp) => {
  const frameTime = performance.now() - frameStart
  console.log(`Frame took ${frameTime}ms`)
})
```

**After (Modern):**

```tsx
import { useFrame } from '@react-three/fiber'

function FrameStats() {
  const frameStartRef = useRef(0)

  // Before frame
  useFrame(
    () => {
      frameStartRef.current = performance.now()
    },
    { phase: 'start' },
  )

  // After frame
  useFrame(
    () => {
      const frameTime = performance.now() - frameStartRef.current
      console.log(`Frame took ${frameTime}ms`)
    },
    { phase: 'finish' },
  )

  return null
}
```

---

#### Example 2: Idle State Handling

**Before (Legacy):**

```tsx
import { addTail } from '@react-three/fiber'

const unsub = addTail((timestamp) => {
  saveApplicationState()
  console.log('Rendering stopped, state saved')
})
```

**After (Modern):**

```tsx
import { useFrame } from '@react-three/fiber'
import { useEffect } from 'react'

function IdleStateHandler() {
  const { scheduler } = useFrame()

  useEffect(() => {
    const unsub = scheduler.onIdle((timestamp) => {
      saveApplicationState()
      console.log('Rendering stopped, state saved')
    })

    return unsub
  }, [scheduler])

  return null
}
```

---

#### Example 3: Global Pre-render Logic

**Before (Legacy):**

```tsx
import { addEffect } from '@react-three/fiber'

const unsub = addEffect((timestamp) => {
  updateGlobalPhysics()
  processInputQueue()
})
```

**After (Modern):**

```tsx
import { useFrame } from '@react-three/fiber'

function GlobalLogic() {
  useFrame(
    (state, delta) => {
      updateGlobalPhysics(delta)
      processInputQueue()
    },
    { phase: 'start', id: 'global-logic' },
  )

  return null
}

// Usage in App
function App() {
  return (
    <Canvas>
      <GlobalLogic />
      {/* Rest of scene */}
    </Canvas>
  )
}
```

---

## Type Definitions

```typescript
// Modern APIs
function invalidate(state?: RootState, frames?: number, stackFrames?: boolean): void

function advance(timestamp: number, runGlobalEffects?: boolean, state?: RootState, frame?: XRFrame): void

// Legacy APIs (Deprecated)
type GlobalRenderCallback = (timestamp: number) => void

function addEffect(callback: GlobalRenderCallback): () => void
function addAfterEffect(callback: GlobalRenderCallback): () => void
function addTail(callback: GlobalRenderCallback): () => void
```

---

## See Also

- **[useFrame Hook](./useFrame.md)** - Complete useFrame documentation with examples
- **[Scheduler API](./scheduler.md)** - Deep dive into the Scheduler class
- **[Canvas Props](https://docs.pmnd.rs/react-three-fiber/api/canvas)** - Canvas configuration including `frameloop` prop
