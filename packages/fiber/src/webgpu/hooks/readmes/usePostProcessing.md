# usePostProcessing Hook

Declarative WebGPU post-processing setup with automatic scene pass creation and MRT (Multiple Render Target) configuration.

PostProcessing is now a main level component within ThreeJS.
EffectComposer and super complex passes will be less common and shared Fn Nodes and workflows will become the norm.

What I expect is instead of some new library with complex passes/works it be a collection of pass nodes with some utils to glue them together. This acts as a base for user _OR_ libraries to build onto.

New hook to access and setup post production. This hook does a LOT behind the scenes.

- Running this at all creates a postProcess object, puts it on the state, and creates a default ScenePass
- Two input callbacks, one for after creation one for pre-creation (set mrt etc)
- access to full nodes and uniforms like other nodes
- passes isolated in their own records
- warnings against too many inits bc/race conditions.

## You MUST set the outputNode if you are changing from the default scenePass. I toyed with doing this automatically but you should be deliberate if you are messing with this

## API

```tsx
// Basic post-processing
usePostProcessing(({ postProcessing, passes }) => {
  postProcessing.outputNode = bloom(passes.scenePass.getTextureNode())
})

// With MRT setup for advanced effects
usePostProcessing(
  // mainCB - configure output
  ({ postProcessing, passes }) => {
    const beauty = passes.scenePass.getTextureNode()
    const velocity = passes.scenePass.getTextureNode('velocity')
    postProcessing.outputNode = motionBlur(beauty, velocity)
  },
  // setupCB - configure MRT
  ({ passes }) => {
    passes.scenePass.setMRT(mrt({ output, velocity }))
  },
)

// Read-only access
const { postProcessing, passes } = usePostProcessing()
```

### Parameters

| Parameter | Type                          | Description                                   |
| --------- | ----------------------------- | --------------------------------------------- |
| `mainCB`  | `PostProcessingMainCallback`  | Configure outputNode and create effect passes |
| `setupCB` | `PostProcessingSetupCallback` | Optional. Configure MRT on scenePass          |

### Callbacks

```typescript
type PostProcessingMainCallback = (state: RootState) => PassRecord | void
type PostProcessingSetupCallback = (state: RootState) => PassRecord | void
```

Both callbacks receive full RootState for access to uniforms, nodes, camera, etc.

### Return Value

```typescript
interface UsePostProcessingReturn {
  passes: PassRecord // All registered passes
  postProcessing: PostProcessing | null
  clearPasses: () => void // Clear all passes
  reset: () => void // Reset PostProcessing instance
  rebuild: () => void // Force callback re-run
  isReady: boolean // PostProcessing configured
}
```

---

## Basic Usage

### Simple Bloom Effect

```tsx
import { usePostProcessing } from '@react-three/fiber/webgpu'
import { bloom } from 'three/tsl'

function Scene() {
  usePostProcessing(({ postProcessing, passes }) => {
    const sceneTexture = passes.scenePass.getTextureNode()
    postProcessing.outputNode = bloom(sceneTexture, 1.5, 0.1, 0.9)
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
  const { postProcessing, passes, isReady } = usePostProcessing()

  if (!isReady) return <div>Loading...</div>

  return (
    <div>
      <p>Passes: {Object.keys(passes).join(', ')}</p>
      <p>Output: {postProcessing?.outputNode ? 'Configured' : 'None'}</p>
    </div>
  )
}
```

---

## What the Hook Does Automatically

1. **Creates PostProcessing instance** if not exists
2. **Creates default scenePass** (no MRT by default)
3. **Sets default outputNode** to scenePass (passthrough)
4. **Handles scene/camera changes** (recreates scenePass only when needed)
5. **Persists across unmounts** (no auto-cleanup)

---

## MRT (Multiple Render Targets)

For advanced effects like motion blur, velocity buffers, G-buffers:

### Motion Blur Example

```tsx
import { usePostProcessing } from '@react-three/fiber/webgpu'
import { mrt, output, velocity } from 'three/tsl'
import { motionBlur } from 'three/addons/tsl/display/MotionBlur.js'

function PostProcessingManager() {
  usePostProcessing(
    // mainCB - configure effect
    ({ postProcessing, passes }) => {
      const beauty = passes.scenePass.getTextureNode()
      const vel = passes.scenePass.getTextureNode('velocity')

      postProcessing.outputNode = motionBlur(beauty, vel.mul(1.0))
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
  usePostProcessing(
    ({ postProcessing, passes }) => {
      const color = passes.scenePass.getTextureNode()
      const normals = passes.scenePass.getTextureNode('normal')
      const depths = passes.scenePass.getTextureNode('depth')

      // Deferred lighting pass
      postProcessing.outputNode = deferredLighting(color, normals, depths)
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

- PostProcessing is first created
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

  usePostProcessing(({ postProcessing, passes, uniforms }) => {
    // Access via uniforms (always current)
    postProcessing.outputNode = bloom(passes.scenePass.getTextureNode(), uniforms.uIntensity)
  })
}
```

---

## Examples

### Vignette Effect

```tsx
import { screenUV } from 'three/tsl'

function VignetteEffect() {
  usePostProcessing(({ postProcessing, passes }) => {
    const scene = passes.scenePass.getTextureNode()

    // Distance from center creates vignette
    const vignette = screenUV.distance(0.5).remap(0.6, 1).mul(2).clamp().oneMinus()

    postProcessing.outputNode = scene.mul(vignette)
  })

  return null
}
```

### Multi-Pass Effects

```tsx
import { pass, bloom, pass as effectPass } from 'three/tsl'

function MultiPassEffects() {
  usePostProcessing(({ postProcessing, passes, scene, camera }) => {
    // Start with scene
    let output = passes.scenePass.getTextureNode()

    // Apply bloom
    output = bloom(output, 1.5, 0.1, 0.9)

    // Create custom pass
    const customPass = effectPass(scene, camera)
    customPass.setMRT(/* custom MRT */)
    output = customPass.getTextureNode()

    postProcessing.outputNode = output

    // ✅ IMPORTANT: Return passes to register them in state
    // Returned passes are merged into state.passes
    return { customPass }
  })
}

// Now accessible in other components
function OtherComponent() {
  const { passes } = usePostProcessing()
  // passes.customPass is available!
}
```

### Conditional Effects

```tsx
function ConditionalEffect() {
  const { useBloom } = useControls({ useBloom: true })
  const { uUseBloom } = useUniforms(() => ({ uUseBloom: useBloom ? 1 : 0 }))

  usePostProcessing(({ postProcessing, passes, uniforms }) => {
    const scene = passes.scenePass.getTextureNode()

    // Use uniforms for dynamic switching (no callback re-run needed)
    const bloomEffect = bloom(scene, 1.5, 0.1, 0.9)
    const output = select(uniforms.uUseBloom.greaterThan(0.5), bloomEffect, scene)

    postProcessing.outputNode = output
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

  usePostProcessing(({ postProcessing, passes, uniforms }) => {
    const scene = passes.scenePass.getTextureNode()
    const bloom = uniforms.bloom

    postProcessing.outputNode = bloom(scene, bloom.bloomIntensity, 0.1, bloom.bloomThreshold)
  })
}
```

---

## Registering Custom Passes

**How Pass Registration Works:**

Both `setupCB` and `mainCB` can register passes by **returning** an object. The hook automatically merges returned passes into `state.passes`.

### ❌ Wrong: Direct Assignment

```tsx
usePostProcessing(({ postProcessing, passes, scene, camera }) => {
  const customPass = pass(scene, camera)

  // ❌ WRONG: This won't register the pass!
  // Direct assignment doesn't trigger state update
  passes.customPass = customPass

  postProcessing.outputNode = customPass
})
```

### ✅ Correct: Return from Callback

```tsx
usePostProcessing(({ postProcessing, passes, scene, camera }) => {
  const customPass = pass(scene, camera)

  postProcessing.outputNode = customPass

  // ✅ CORRECT: Return passes to register them
  return { customPass }
})

// Now accessible in other components
function OtherComponent() {
  const { passes } = usePostProcessing()

  useFrame(() => {
    // passes.customPass is available!
    console.log(passes.customPass)
  })
}
```

### Registering in setupCB

```tsx
usePostProcessing(
  // mainCB - configure output
  ({ postProcessing, passes }) => {
    const beauty = passes.scenePass.getTextureNode()
    const velocity = passes.velocityPass.getTextureNode('velocity')
    postProcessing.outputNode = motionBlur(beauty, velocity)
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
usePostProcessing(({ postProcessing, scene, camera }) => {
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

  postProcessing.outputNode = ssao(depth, normal, ao)

  // ✅ Return all passes to register them
  return { depthPass, normalPass, aoPass }
})
```

### Why Return Instead of Direct Assignment?

The hook uses React state management:

1. **Return from callback** → Merged into `state.passes` → Available everywhere via `usePostProcessing()`
2. **Direct assignment** → Only local variable → Lost after callback completes

```tsx
// Inside usePostProcessing.tsx implementation:
if (mainResult && typeof mainResult === 'object') {
  currentPasses = { ...currentPasses, ...mainResult }
  set({ passes: currentPasses }) // ← Triggers state update
}
```

---

## Manual Control

### Reset PostProcessing

```tsx
function ResetButton() {
  const { reset } = usePostProcessing()

  return <button onClick={reset}>Reset Post-Processing</button>
}
```

### Rebuild Callbacks

```tsx
function RebuildButton() {
  const { rebuild } = usePostProcessing()

  // Force callbacks to re-run with current closure values
  return <button onClick={rebuild}>Rebuild Effects</button>
}
```

### Clear All Passes

```tsx
function ClearButton() {
  const { clearPasses } = usePostProcessing()

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
usePostProcessing(({ passes }) => {
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

usePostProcessing(({ postProcessing, passes, scene, camera }) => {
  // Create custom pass
  const customPass = pass(scene, camera)

  // Configure if needed
  customPass.setMRT(/* ... */)

  // Use in effect chain
  const sceneOutput = passes.scenePass.getTextureNode()
  const customOutput = customPass.getTextureNode()
  postProcessing.outputNode = mix(sceneOutput, customOutput, 0.5)

  // Register pass by returning it
  return { customPass }
})
```

---

## Best Practices

### 1. One usePostProcessing Per App

Only call once near the root:

```tsx
// ✅ Good: Single PP manager
function App() {
  return (
    <Canvas renderer>
      <PostProcessingManager />
      <Scene />
    </Canvas>
  )
}

function PostProcessingManager() {
  usePostProcessing(/* ... */)
  return null
}

// ❌ Bad: Multiple PP setups
function SceneA() {
  usePostProcessing(/* ... */) // Overwrites
}
function SceneB() {
  usePostProcessing(/* ... */) // Overwrites
}
```

### 2. Use Uniforms for Dynamic Values

```tsx
// ✅ Good: Uniforms for dynamic control
const { uIntensity } = useUniforms({ uIntensity: 1.0 })

usePostProcessing(({ postProcessing, passes, uniforms }) => {
  postProcessing.outputNode = bloom(
    passes.scenePass.getTextureNode(),
    uniforms.uIntensity  // Reactive without callback re-run
  )
})

// ❌ Bad: Closure values need rebuild
const intensity = 1.0
usePostProcessing(({ postProcessing, passes }) => {
  postProcessing.outputNode = bloom(
    passes.scenePass.getTextureNode(),
    intensity  // Stale value, needs rebuild() to update
  })
})
```

### 3. MRT Setup in setupCB

```tsx
// ✅ Good: MRT in setupCB
usePostProcessing(
  ({ postProcessing, passes }) => {
    // MRT already configured
    const velocity = passes.scenePass.getTextureNode('velocity')
  },
  ({ passes }) => {
    passes.scenePass.setMRT(mrt({ output, velocity }))
  },
)

// ❌ Bad: MRT in mainCB (may run too late)
usePostProcessing(({ postProcessing, passes }) => {
  passes.scenePass.setMRT(mrt({ output, velocity })) // Timing issues
  const velocity = passes.scenePass.getTextureNode('velocity')
})
```

### 4. Return Custom Passes

```tsx
// ✅ Good: Return custom passes to register them in state
usePostProcessing(({ postProcessing, passes, scene, camera }) => {
  const customPass = pass(scene, camera)
  postProcessing.outputNode = customPass

  // Return to register - available everywhere
  return { customPass }
})

// Access returned passes in other components
function OtherComponent() {
  const { passes } = usePostProcessing()
  // passes.customPass is available!
}
```

---

## Error Handling

### WebGL Error

```tsx
// Throws if used with WebGL renderer
function Scene() {
  usePostProcessing(/* ... */) // Error: WebGPU only
}

// Must use WebGPU renderer
;<Canvas renderer>
  {' '}
  {/* ✅ */}
  <Scene />
</Canvas>
```

### Missing PostProcessing

```tsx
// Read-only access when PP not configured
const { postProcessing, isReady } = usePostProcessing()

if (!isReady) {
  console.log('PostProcessing not ready')
  return null
}

// Safe to use postProcessing
postProcessing.outputNode = /* ... */
```

---

## TypeScript

Full type inference:

```typescript
import type { PostProcessing, PassNode } from 'three/webgpu'

const {
  passes, // PassRecord
  postProcessing, // PostProcessing | null
  clearPasses, // () => void
  reset, // () => void
  rebuild, // () => void
  isReady, // boolean
} = usePostProcessing()
```

Typed callbacks:

```typescript
import type { RootState, PassRecord } from '@react-three/fiber'

const mainCB: PostProcessingMainCallback = ({ postProcessing, passes }) => {
  // Typed parameters
}

const setupCB: PostProcessingSetupCallback = ({ passes }) => {
  // Typed parameters
}

usePostProcessing(mainCB, setupCB)
```

---

## Related Documentation

- **[useUniforms](./useUniforms.md)** - Dynamic effect parameters
- **[useNodes](./useNodes.md)** - Shared effect functions
- **[Overview](./overview.md)** - WebGPU hooks architecture
- **[Three.js PostProcessing](https://threejs.org/docs/#api/en/renderers/webgpu/PostProcessing)** - Three.js PP docs
- **[TSL Effects](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/tsl/display)** - Built-in TSL effects
