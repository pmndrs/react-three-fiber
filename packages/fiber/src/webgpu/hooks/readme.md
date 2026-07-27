# WebGPU Hooks

React hooks for WebGPU/TSL shader development. **v10+ only.**

```tsx
import { useUniforms, useNodes, useLocalNodes, useRenderPipeline } from '@react-three/fiber/webgpu'
```

| Hook                           | What it does                                                |
| ------------------------------ | ----------------------------------------------------------- |
| `useUniform`                   | Single uniform, create/get/update                           |
| `useUniforms`                  | Batch uniforms with scoping and create-if-not-exists        |
| `useNodes`                     | Global TSL node sharing                                     |
| `useLocalNodes`                | Component-local nodes that rebuild when their inputs change |
| `useRenderPipeline`            | Render pipeline setup — scene pass, MRT, `outputNode`       |
| `useBuffers` / `useGPUStorage` | **Experimental.** GPU compute buffers and storage textures  |

📖 **Full documentation:** https://docs.pmnd.rs/react-three-fiber/webgpu/overview
