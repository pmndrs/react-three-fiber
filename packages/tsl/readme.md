# @react-three/tsl

TSL resource hooks for [react-three-fiber](https://github.com/pmndrs/react-three-fiber) on WebGPU: shared uniforms, nodes, buffers, GPU storage and render pipelines.

```bash
npm install @react-three/tsl
```

```tsx
import { Canvas, useFrame } from '@react-three/fiber/webgpu'
import { useUniforms, useNodes } from '@react-three/tsl'
import { positionLocal, normalLocal, sin, time } from 'three/tsl'

function Wobble() {
  const { uAmount } = useUniforms({ uAmount: 0.2 })
  const { offset } = useNodes(() => ({ offset: normalLocal.mul(sin(time).mul(uAmount)) }))

  return (
    <mesh>
      <sphereGeometry />
      <meshStandardNodeMaterial positionNode={positionLocal.add(offset)} />
    </mesh>
  )
}

function Driver() {
  // The resources are on RootState: frame state, useThree and creators all read them.
  useFrame(({ uniforms, elapsed }) => {
    uniforms.uAmount.value = Math.abs(Math.sin(elapsed))
  })
  return null
}

export const App = () => (
  <Canvas>
    <Wobble />
    <Driver />
  </Canvas>
)
```

| Export                        | What it does                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `useUniforms`, `useUniform`   | Create or read uniforms, shared across components, optionally scoped         |
| `useNodes`, `useLocalNodes`   | Share TSL nodes across components, or compose them locally                   |
| `useBuffers`, `useGPUStorage` | Buffers and storage textures for compute                                     |
| `useRenderPipeline`           | Post-processing with three's `RenderPipeline` (scene pass, MRT, output node) |

Resources belong to the renderer: a primary canvas, its secondary canvases (`renderer={{ primaryCanvas }}`) and every portal inside them share one set. They live on the primary canvas's `RootState` (`state.uniforms`, `state.nodes`, `state.buffers`, `state.gpuStorage`); secondaries hold the same objects and portals inherit them from their parent (a portal's scene and camera stay its own), so `state.uniforms` reads the same everywhere.

Works with `@react-three/fiber/webgpu`, and with `@react-three/fiber` when the `<Canvas>` has the `renderer` prop. It reaches fiber only through the three-free `@react-three/fiber/extension` entry, so it never adds a second copy of fiber to your bundle.

Full documentation: [WebGPU & TSL](https://github.com/pmndrs/react-three-fiber/tree/v10/docs/webgpu).
