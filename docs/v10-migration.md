---
title: 'v10 Migration Guide'
description: Upgrading to v10 - WebGPU support, new scheduler, and what changes for you
nav: 14
---

# v10 Migration Guide

> **Alpha Release** - v10 is currently in alpha. We'd love your feedback!
>
> - [Report an issue](https://github.com/pmndrs/react-three-fiber/issues/new?labels=v10) - Found a bug? Let us know
> - [Join the discussion](https://github.com/pmndrs/react-three-fiber/discussions) - Questions or ideas
> - [Track progress](https://github.com/pmndrs/react-three-fiber/projects) - See what's coming

## The Short Version

**Your existing code works.** v10 is designed to be backwards compatible. The default import now supports both WebGL and WebGPU renderers, and your app will continue using WebGL unless you explicitly opt into WebGPU. You will however get a depreciation warning and should be importing from `/legacy` if you plan to stay with the old renderer.

## Quick Checklist

For most apps, here's all you need to do:

- [ ] Replace `state.gl` with `state.renderer`
- [ ] That's it!

If you specifically need `WebGLRenderer` and want to avoid the warning:

- [ ] Import from `@react-three/fiber/legacy` instead of `@react-three/fiber`

**Want WebGPU?** Just add `renderer` to Canvas - no manual init required:

```tsx
<Canvas renderer>
  <Scene />
</Canvas>
```

You can also pass renderer parameters or a pre-created renderer instance. R3F handles initialization automatically:

```tsx
// Pass parameters
<Canvas renderer={{ antialias: true, forceWebGL: false }}>

// Or a renderer instance (still no init needed)
<Canvas renderer={myWebGPURenderer}>
```

---

## Breaking Changes

### `gl` renamed to `renderer`

The `gl` property in state has been renamed to `renderer` to be renderer-agnostic and match Three.js conventions.

```diff
function MyComponent() {
  const { renderer } = useThree()
-  const { gl } = useThree()

  // Or in useFrame
-  useFrame(({ gl }) => {
+  useFrame(({ renderer }) => {
    // ...
  })
}
```

> **Note:** `gl` still works but will log a deprecation warning. Update at your convenience.

### Renderer Selection

| Your Use Case             | Import From                 | Renderer             |
| ------------------------- | --------------------------- | -------------------- |
| Default (webgl or webgpu) | `@react-three/fiber`        | WebGL (WebGPU-ready) |
| WebGL only, no warnings   | `@react-three/fiber/legacy` | WebGLRenderer        |
| WebGPU with TSL           | `@react-three/fiber/webgpu` | WebGPURenderer       |

```tsx
// Default - works with both WebGL and WebGPU
import { Canvas, useFrame } from '@react-three/fiber'

// Legacy - WebGLRenderer only, smaller bundle
import { Canvas, useFrame } from '@react-three/fiber/legacy'

// WebGPU - includes WebGPU hooks for TSL shaders
import { Canvas, useFrame, useUniforms } from '@react-three/fiber/webgpu'
```

### `useFrame` Clock Removed

The `state.clock` (THREE.Clock) has been removed from FrameState. Timing information is now provided directly from the RAF timer, which is more accurate and consistent.

```diff
useFrame((state, delta) => {
-  const elapsed = state.clock.getElapsedTime()
-  const delta = state.clock.getDelta()
+  const { time, delta, elapsed } = state
+  // time: High-resolution timestamp from RAF (milliseconds)
+  // delta: Time since last frame (seconds)
+  // elapsed: Elapsed time since first frame (seconds)
})
```

### Render Phase Takes Over Rendering

**This is a significant behavior change.** In v9, setting a non-zero `priority` on `useFrame` would disable R3F's default rendering, requiring you to call `renderer.render()` manually.

In v10, **registering ANY callback to the `render` phase** takes over the render loop. If you were using priority values and also calling `renderer.render()` yourself, you'll get double-rendering or other unexpected results.

```tsx
// v9: Priority disabled default rendering
useFrame(({ gl, scene, camera }) => {
  gl.render(scene, camera)
}, 1) // priority > 0 meant "I'll handle rendering"

// v10: Use the render phase explicitly
useFrame(
  ({ renderer, scene, camera }) => {
    renderer.render(scene, camera)
  },
  { phase: 'render' },
) // Render phase takes over
```

If you were using priority for ordering purposes (not rendering), switch to the new phase system or `before`/`after` constraints:

```tsx
// v9: Priority for ordering
useFrame(() => physicsStep(), -1)
useFrame(() => updateGame(), 0)
useFrame(() => updateAI(), 1)

// v10: Phase-based ordering (recommended)
useFrame(() => physicsStep(), { phase: 'physics' })
useFrame(() => updateGame(), { phase: 'update' })
useFrame(() => updateAI(), { after: 'update', before: 'render' })
```

---

## What's New

### Powerful New Scheduler

v10 completely rewrites the frame loop with a scheduler that gives you **real control** over how and when your code runs.

**Your existing code works unchanged.** But now you can do so much more:

**Run code in the right order** - No more guessing with priority numbers. Organize your frame work into logical phases that execute in sequence:

```tsx
useFrame(({ delta }) => processInput(), { phase: 'input' })
useFrame(({ delta }) => physicsWorld.step(delta), { phase: 'physics' })
useFrame(({ delta }) => updateGame(delta), { phase: 'update' })
useFrame(({ delta }) => renderEffects(), { phase: 'render' })
```

**Throttle expensive work** - Heavy AI computation? Particle updates? Run them at whatever framerate makes sense:

```tsx
useFrame(() => runAI(), { fps: 20 })
useFrame(() => updateParticles(), { fps: 30 })
useFrame(() => smoothAnimation()) // Full speed
```

**Pause and resume anything** - Every `useFrame` returns controls. Build pause menus, debug tools, or conditional animations:

```tsx
const physics = useFrame(() => simulate(), { phase: 'physics' })
const animations = useFrame(() => animate())

// Pause physics but keep animations running
physics.pause()

// Resume when ready
physics.resume()
```

**Multiple canvases, one loop** - The scheduler manages all your Canvas instances in a single RAF loop. No more frame sync issues.

📚 **Learn more:** [Frame Loop Overview](../packages/fiber/src/core/hooks/useFrame/readmes/frame-loop-overview.md)

---

### WebGPU & TSL Hooks

v10 brings **first-class WebGPU support** with a suite of hooks that make TSL (Three.js Shading Language) feel native to React.

**Write shaders the React way** - Uniforms, nodes, and post-processing all managed declaratively. Share shader logic across components. Update values without re-renders.

```tsx
import { Canvas, useUniforms, useNodes, useLocalNodes } from '@react-three/fiber/webgpu'
import { Fn, vec3, sin, time, positionLocal, normalLocal } from 'three/tsl'

// Define reusable shader functions
function GlobalEffects() {
  useNodes(() => ({
    wobble: Fn(() => vec3(sin(time), sin(time.mul(1.3)), sin(time.mul(2)))),
  }))
  return null
}

// Use them anywhere - shared across your entire app
function WobblyMesh() {
  const { uIntensity } = useUniforms({ uIntensity: 0.5 })

  const { displacement } = useLocalNodes(({ nodes }) => ({
    displacement: nodes.wobble.mul(uIntensity),
  }))

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial positionNode={positionLocal.add(normalLocal.mul(displacement))} />
    </mesh>
  )
}
```

**What you get:**

- **`useUniforms`** - Create and share uniforms across components. Scoping prevents naming conflicts. Auto-converts Leva controls.
- **`useNodes`** - Define TSL functions once, use everywhere. Share expensive noise functions, effects, varyings.
- **`useLocalNodes`** - Compose shared nodes with local logic. Access all uniforms and nodes from state.
- **`usePostProcessing`** - Declarative post-processing setup with automatic MRT configuration.

📚 **Learn more:** [WebGPU Hooks Overview](../packages/fiber/src/webgpu/hooks/readmes/overview.md)

---

## TypeScript Changes

### Test Renderer Entry Points

Match your test renderer import to your fiber import:

```tsx
// If using default fiber
import ReactThreeTestRenderer from '@react-three/test-renderer'

// If using legacy
import ReactThreeTestRenderer from '@react-three/test-renderer/legacy'

// If using WebGPU
import ReactThreeTestRenderer from '@react-three/test-renderer/webgpu'
```

---

## FAQ

### Do I need to switch to WebGPU?

No. WebGL remains the default and will continue to be supported. WebGPU is opt-in for those who want to use TSL shaders or need WebGPU-specific features.

### Will my drei/postprocessing code work?

Yes. The ecosystem packages are compatible with v10's default import. WebGPU-specific features may require updates to ecosystem packages over time.

### What if I'm using `state.gl` everywhere?

It still works! You'll see a console warning in development, but your code will function correctly. Update to `state.renderer` when convenient.

---

## Migration from v9

If you're coming from v9, also review the [v9 Migration Guide](./tutorials/v9-migration-guide.mdx) for React 19 compatibility changes that may apply.

---

## Need Help?

- [GitHub Discussions](https://github.com/pmndrs/react-three-fiber/discussions)
- [Discord](https://discord.gg/ZZjjNvJ)
