# useRenderPipeline Hook

Declarative WebGPU render pipeline setup with automatic scene pass creation and MRT (Multiple Render Target) configuration.

RenderPipeline is now a main level component within ThreeJS (currently named PostProcessing, will be renamed to RenderPipeline in a future release).
EffectComposer and super complex passes will be less common and shared Fn Nodes and workflows will become the norm.

What I expect is instead of some new library with complex passes/works it be a collection of pass nodes with some utils to glue them together. This acts as a base for user _OR_ libraries to build onto.

New hook to access and setup render pipeline. This hook does a LOT behind the scenes.

- Running this at all creates a renderPipeline object, puts it on the state, and creates a default ScenePass
- Two input callbacks, one for after creation one for pre-creation (set mrt etc)
- access to full nodes and uniforms like other nodes
- passes isolated in their own records
- warnings against too many inits bc/race conditions.

## You MUST set the outputNode if you are changing from the default scenePass. I toyed with doing this automatically but you should be deliberate if you are messing with this

## API

```tsx
// Basic render pipeline
useRenderPipeline(({ renderPipeline, passes }) => {
  renderPipeline.outputNode = bloom(passes.scenePass.getTextureNode())
})

// With MRT setup for advanced effects
useRenderPipeline(
  // mainCB - configure output
  ({ renderPipeline, passes }) => {
    const beauty = passes.scenePass.getTextureNode()
    const velocity = passes.scenePass.getTextureNode('velocity')
    renderPipeline.outputNode = motionBlur(beauty, velocity)
  },
  // setupCB - configure MRT
  ({ passes }) => {
    passes.scenePass.setMRT(mrt({ output, velocity }))
  },
)

// Read-only access
const { renderPipeline, passes } = useRenderPipeline()
```

### Parameters

| Parameter | Type                          | Description                                   |
| --------- | ----------------------------- | --------------------------------------------- |
| `mainCB`  | `RenderPipelineMainCallback`  | Configure outputNode and create effect passes |
| `setupCB` | `RenderPipelineSetupCallback` | Optional. Configure MRT on scenePass          |

### Callbacks

```typescript
type RenderPipelineMainCallback = (state: RootState) => PassRecord | void
type RenderPipelineSetupCallback = (state: RootState) => PassRecord | void
```

Both callbacks receive full RootState for access to uniforms, nodes, camera, etc.

### Return Value

```typescript
interface UseRenderPipelineReturn {
  passes: PassRecord // All registered passes
  renderPipeline: RenderPipeline | null
  clearPasses: () => void // Clear all passes
  reset: () => void // Reset RenderPipeline instance
  rebuild: () => void // Force callback re-run
  isReady: boolean // RenderPipeline configured
}
```

---

## Basic Usage

### Simple Bloom Effect

```tsx
import { useRenderPipeline } from '@react-three/fiber/webgpu'
import { bloom } from 'three/tsl'

function Scene() {
  useRenderPipeline(({ renderPipeline, passes }) => {
    const sceneTexture = passes.scenePass.getTextureNode()
    renderPipeline.outputNode = bloom(sceneTexture, 1.5, 0.1, 0.9)
  })

  return (
    <mesh>
      <boxGeometry />
      <meshBasicNodeMaterial color="hotpink" />
    </mesh>
  )
}
```

### Read-Only Access

```tsx
function DebugPanel() {
  const { renderPipeline, passes, isReady } = useRenderPipeline()

  if (!isReady) return <div>Loading...</div>

  return (
    <div>
      <p>Passes: {Object.keys(passes).join(', ')}</p>
      <p>Output: {renderPipeline?.outputNode ? 'Configured' : 'None'}</p>
    </div>
  )
}
```

---

## What the Hook Does Automatically

1. **Creates RenderPipeline instance** if not exists
2. **Creates default scenePass** (no MRT by default)
3. **Sets default outputNode** to scenePass (passthrough)
4. **Handles scene/camera changes** (recreates scenePass only when needed)
5. **Persists across unmounts** (no auto-cleanup)

---

## MRT (Multiple Render Targets)

For advanced effects like motion blur, velocity buffers, G-buffers:

### Motion Blur Example

```tsx
import { useRenderPipeline } from '@react-three/fiber/webgpu'
import { mrt, output, velocity } from 'three/tsl'
import { motionBlur } from 'three/addons/tsl/display/MotionBlur.js'

function RenderPipelineManager() {
  useRenderPipeline(
    // mainCB - configure effect
    ({ renderPipeline, passes }) => {
      const beauty = passes.scenePass.getTextureNode()
      const vel = passes.scenePass.getTextureNode('velocity')

      renderPipeline.outputNode = motionBlur(beauty, vel.mul(1.0))
    },
    // setupCB - configure MRT BEFORE mainCB runs
    ({ passes }) => {
      passes.scenePass.setMRT(
        mrt({
          output, // Default color output
          velocity, // Velocity buffer for motion blur
        }),
      )
    },
  )

  return null
}
```

### G-Buffer Setup

```tsx
import { mrt, output, normal, depth } from 'three/tsl'

function DeferredRenderer() {
  useRenderPipeline(
    ({ renderPipeline, passes }) => {
      const color = passes.scenePass.getTextureNode()
      const normals = passes.scenePass.getTextureNode('normal')
      const depths = passes.scenePass.getTextureNode('depth')

      // Deferred lighting pass
      renderPipeline.outputNode = deferredLighting(color, normals, depths)
    },
    ({ passes }) => {
      passes.scenePass.setMRT(
        mrt({
          output,
          normal,
          depth,
        }),
      )
    },
  )

  return null
}
```

---

## Callback Execution

### Execution Order

1. `setupCB` runs **first** (MRT must be configured before rendering)
2. `mainCB` runs **second** (effect setup after MRT is ready)

### When Callbacks Run

Callbacks execute when:

- RenderPipeline is first created
- Scene or camera changes (scenePass needs recreation)
- `rebuild()` is explicitly called

Callbacks **do NOT re-run** on:

- Component re-renders
- HMR (Hot Module Reload) - prevents TSL corruption

Use refs for callback values to get current closure:

```tsx
function DynamicEffect() {
  const { intensity } = useControls({ intensity: 1.0 })

  // Get uniform from store to use in callback
  const { uIntensity } = useUniforms(() => ({ uIntensity: intensity }))

  useRenderPipeline(({ renderPipeline, passes, uniforms }) => {
    // Access via uniforms (always current)
    renderPipeline.outputNode = bloom(passes.scenePass.getTextureNode(), uniforms.uIntensity)
  })
}
```

---

## Examples

### Vignette Effect

```tsx
import { screenUV } from 'three/tsl'

function VignetteEffect() {
  useRenderPipeline(({ renderPipeline, passes }) => {
    const scene = passes.scenePass.getTextureNode()

    // Distance from center creates vignette
    const vignette = screenUV.distance(0.5).remap(0.6, 1).mul(2).clamp().oneMinus()

    renderPipeline.outputNode = scene.mul(vignette)
  })

  return null
}
```

### Multi-Pass Effects

```tsx
import { pass, bloom, pass as effectPass } from 'three/tsl'

function MultiPassEffects() {
  useRenderPipeline(({ renderPipeline, passes, scene, camera }) => {
    // Start with scene
    let output = passes.scenePass.getTextureNode()

    // Apply bloom
    output = bloom(output, 1.5, 0.1, 0.9)

    // Create custom pass
    const customPass = effectPass(scene, camera)
    customPass.setMRT(/* custom MRT */)
    output = customPass.getTextureNode()

    renderPipeline.outputNode = output

    // ✅ IMPORTANT: Return passes to register them in state
    // Returned passes are merged into state.passes
    return { customPass }
  })
}

// Now accessible in other components
function OtherComponent() {
  const { passes } = useRenderPipeline()
  // passes.customPass is available!
}
```

### Conditional Effects

```tsx
function ConditionalEffect() {
  const { useBloom } = useControls({ useBloom: true })
  const { uUseBloom } = useUniforms(() => ({ uUseBloom: useBloom ? 1 : 0 }))

  useRenderPipeline(({ renderPipeline, passes, uniforms }) => {
    const scene = passes.scenePass.getTextureNode()

    // Use uniforms for dynamic switching (no callback re-run needed)
    const bloomEffect = bloom(scene, 1.5, 0.1, 0.9)
    const output = select(uniforms.uUseBloom.greaterThan(0.5), bloomEffect, scene)

    renderPipeline.outputNode = output
  })
}
```

### Accessing Uniforms in Effects

```tsx
function DynamicBloom() {
  const { intensity, threshold } = useControls({
    intensity: { value: 1.5, min: 0, max: 3 },
    threshold: { value: 0.9, min: 0, max: 1 },
  })

  // Register uniforms
  useUniforms(
    () => ({
      bloomIntensity: intensity,
      bloomThreshold: threshold,
    }),
    'bloom',
  )

  useRenderPipeline(({ renderPipeline, passes, uniforms }) => {
    const scene = passes.scenePass.getTextureNode()
    const bloom = uniforms.bloom

    renderPipeline.outputNode = bloom(scene, bloom.bloomIntensity, 0.1, bloom.bloomThreshold)
  })
}
```

---

## Registering Custom Passes

**How Pass Registration Works:**

Both `setupCB` and `mainCB` can register passes by **returning** an object. The hook automatically merges returned passes into `state.passes`.

### ❌ Wrong: Direct Assignment

```tsx
useRenderPipeline(({ renderPipeline, passes, scene, camera }) => {
  const customPass = pass(scene, camera)

  // ❌ WRONG: This won't register the pass!
  // Direct assignment doesn't trigger state update
  passes.customPass = customPass

  renderPipeline.outputNode = customPass
})
```

### ✅ Correct: Return from Callback

```tsx
useRenderPipeline(({ renderPipeline, passes, scene, camera }) => {
  const customPass = pass(scene, camera)

  renderPipeline.outputNode = customPass

  // ✅ CORRECT: Return passes to register them
  return { customPass }
})

// Now accessible in other components
function OtherComponent() {
  const { passes } = useRenderPipeline()

  useFrame(() => {
    // passes.customPass is available!
    console.log(passes.customPass)
  })
}
```

### Registering in setupCB

```tsx
useRenderPipeline(
  // mainCB - configure output
  ({ renderPipeline, passes }) => {
    const beauty = passes.scenePass.getTextureNode()
    const velocity = passes.velocityPass.getTextureNode('velocity')
    renderPipeline.outputNode = motionBlur(beauty, velocity)
  },
  // setupCB - register passes with MRT
  ({ passes, scene, camera }) => {
    const velocityPass = pass(scene, camera)
    velocityPass.setMRT(mrt({ output, velocity }))

    // ✅ Return from setupCB to register
    return { velocityPass }
  },
)
```

### Registering Multiple Passes

```tsx
useRenderPipeline(({ renderPipeline, scene, camera }) => {
  const depthPass = pass(scene, camera)
  depthPass.setMRT(mrt({ depth }))

  const normalPass = pass(scene, camera)
  normalPass.setMRT(mrt({ normal }))

  const aoPass = pass(scene, camera)
  aoPass.setMRT(mrt({ occlusion }))

  // Combine passes
  const depth = depthPass.getTextureNode('depth')
  const normal = normalPass.getTextureNode('normal')
  const ao = aoPass.getTextureNode('occlusion')

  renderPipeline.outputNode = ssao(depth, normal, ao)

  // ✅ Return all passes to register them
  return { depthPass, normalPass, aoPass }
})
```

### Why Return Instead of Direct Assignment?

The hook uses React state management:

1. **Return from callback** → Merged into `state.passes` → Available everywhere via `useRenderPipeline()`
2. **Direct assignment** → Only local variable → Lost after callback completes

```tsx
// Inside useRenderPipeline.tsx implementation:
if (mainResult && typeof mainResult === 'object') {
  currentPasses = { ...currentPasses, ...mainResult }
  set({ passes: currentPasses }) // ← Triggers state update
}
```

---

## Manual Control

### Reset RenderPipeline

```tsx
function ResetButton() {
  const { reset } = useRenderPipeline()

  return <button onClick={reset}>Reset Render Pipeline</button>
}
```

### Rebuild Callbacks

```tsx
function RebuildButton() {
  const { rebuild } = useRenderPipeline()

  // Force callbacks to re-run with current closure values
  return <button onClick={rebuild}>Rebuild Effects</button>
}
```

### Clear All Passes

```tsx
function ClearButton() {
  const { clearPasses } = useRenderPipeline()

  return <button onClick={clearPasses}>Clear All Passes</button>
}
```

---

## Pass Registry

Passes are stored in `state.passes`:

```typescript
interface PassRecord {
  scenePass: PassNode // Always created automatically
  [key: string]: any // Custom passes you add
}
```

### Accessing Passes

```tsx
// In callback
useRenderPipeline(({ passes }) => {
  passes.scenePass // Default scene pass
  passes.customPass // Your custom pass
})

// From useThree
const { passes } = useThree()
console.log(passes.scenePass)
```

### Creating Custom Passes

```tsx
import { pass } from 'three/tsl'

useRenderPipeline(({ renderPipeline, passes, scene, camera }) => {
  // Create custom pass
  const customPass = pass(scene, camera)

  // Configure if needed
  customPass.setMRT(/* ... */)

  // Use in effect chain
  const sceneOutput = passes.scenePass.getTextureNode()
  const customOutput = customPass.getTextureNode()
  renderPipeline.outputNode = mix(sceneOutput, customOutput, 0.5)

  // Register pass by returning it
  return { customPass }
})
```

---

## Best Practices

### 1. One useRenderPipeline Per App

Only call once near the root:

```tsx
// ✅ Good: Single pipeline manager
function App() {
  return (
    <Canvas renderer>
      <RenderPipelineManager />
      <Scene />
    </Canvas>
  )
}

function RenderPipelineManager() {
  useRenderPipeline(/* ... */)
  return null
}

// ❌ Bad: Multiple pipeline setups
function SceneA() {
  useRenderPipeline(/* ... */) // Overwrites
}
function SceneB() {
  useRenderPipeline(/* ... */) // Overwrites
}
```

### 2. Use Uniforms for Dynamic Values

```tsx
// ✅ Good: Uniforms for dynamic control
const { uIntensity } = useUniforms({ uIntensity: 1.0 })

useRenderPipeline(({ renderPipeline, passes, uniforms }) => {
  renderPipeline.outputNode = bloom(
    passes.scenePass.getTextureNode(),
    uniforms.uIntensity  // Reactive without callback re-run
  )
})

// ❌ Bad: Closure values need rebuild
const intensity = 1.0
useRenderPipeline(({ renderPipeline, passes }) => {
  renderPipeline.outputNode = bloom(
    passes.scenePass.getTextureNode(),
    intensity  // Stale value, needs rebuild() to update
  })
})
```

### 3. MRT Setup in setupCB

```tsx
// ✅ Good: MRT in setupCB
useRenderPipeline(
  ({ renderPipeline, passes }) => {
    // MRT already configured
    const velocity = passes.scenePass.getTextureNode('velocity')
  },
  ({ passes }) => {
    passes.scenePass.setMRT(mrt({ output, velocity }))
  },
)

// ❌ Bad: MRT in mainCB (may run too late)
useRenderPipeline(({ renderPipeline, passes }) => {
  passes.scenePass.setMRT(mrt({ output, velocity })) // Timing issues
  const velocity = passes.scenePass.getTextureNode('velocity')
})
```

### 4. Return Custom Passes

```tsx
// ✅ Good: Return custom passes to register them in state
useRenderPipeline(({ renderPipeline, passes, scene, camera }) => {
  const customPass = pass(scene, camera)
  renderPipeline.outputNode = customPass

  // Return to register - available everywhere
  return { customPass }
})

// Access returned passes in other components
function OtherComponent() {
  const { passes } = useRenderPipeline()
  // passes.customPass is available!
}
```

---

## Error Handling

### WebGL Error

```tsx
// Throws if used with WebGL renderer
function Scene() {
  useRenderPipeline(/* ... */) // Error: WebGPU only
}

// Must use WebGPU renderer
;<Canvas renderer>
  {' '}
  {/* ✅ */}
  <Scene />
</Canvas>
```

### Missing RenderPipeline

```tsx
// Read-only access when pipeline not configured
const { renderPipeline, isReady } = useRenderPipeline()

if (!isReady) {
  console.log('RenderPipeline not ready')
  return null
}

// Safe to use renderPipeline
renderPipeline.outputNode = /* ... */
```

---

## TypeScript

Full type inference:

```typescript
import type { RenderPipeline, PassNode } from 'three/webgpu'

const {
  passes, // PassRecord
  renderPipeline, // RenderPipeline | null
  clearPasses, // () => void
  reset, // () => void
  rebuild, // () => void
  isReady, // boolean
} = useRenderPipeline()
```

Typed callbacks:

```typescript
import type { RootState, PassRecord } from '@react-three/fiber'

const mainCB: RenderPipelineMainCallback = ({ renderPipeline, passes }) => {
  // Typed parameters
}

const setupCB: RenderPipelineSetupCallback = ({ passes }) => {
  // Typed parameters
}

useRenderPipeline(mainCB, setupCB)
```

---

## Related Documentation

- **[useUniforms](./useUniforms.md)** - Dynamic effect parameters
- **[useNodes](./useNodes.md)** - Shared effect functions
- **[Overview](./overview.md)** - WebGPU hooks architecture
- **[Three.js RenderPipeline](https://threejs.org/docs/#api/en/renderers/webgpu/RenderPipeline)** - Three.js docs (currently named PostProcessing)
- **[TSL Effects](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/tsl/display)** - Built-in TSL effects
