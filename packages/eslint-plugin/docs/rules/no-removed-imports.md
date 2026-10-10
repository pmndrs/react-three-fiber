Imports that v10 moved, deprecated or removed:

| Import                                                                                                 | In v10                                | Fix                                                        |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------- | ---------------------------------------------------------- |
| `@react-three/fiber/native`                                                                            | moved                                 | 🔧 `@react-three/native`                                   |
| `@react-three/fiber/webgpu`                                                                            | deprecated, removed in the first beta | 🔧 `@react-three/fiber` (which renders with WebGPU)        |
| `@react-three/test-renderer/webgpu`                                                                    | deprecated                            | 🔧 `@react-three/test-renderer`                            |
| TSL hooks (`useUniforms`, `useNodes`, `useLocalNodes`, `useRenderPipeline`, ...) from a fiber entry    | moved                                 | 🔧 `@react-three/tsl`, when every name in the import moves |
| `act`                                                                                                  | removed                               | `act` from `react`                                         |
| `flushGlobalEffects`                                                                                   | removed                               | `useFrame` phases or `getScheduler()`                      |
| `usePostProcessing`                                                                                    | renamed                               | `useRenderPipeline` from `@react-three/tsl`                |
| `removeUniforms`, `clearScope`, `clearRootUniforms`, `removeNodes`, `clearNodeScope`, `clearRootNodes` | removed                               | the utilities `useUniforms()` and `useNodes()` return      |

An import mixing TSL hooks with other names is reported but not fixed, since it has to be split.

Part of the [`migration`](../../README.md#migration) config.

#### ❌ Incorrect

```js
import { Canvas } from '@react-three/fiber/webgpu'
import { useUniforms, useNodes } from '@react-three/fiber/webgpu'
import { act } from '@react-three/fiber'
```

#### ✅ Correct

```js
import { Canvas } from '@react-three/fiber'
import { useUniforms, useNodes } from '@react-three/tsl'
import { act } from 'react'
```
