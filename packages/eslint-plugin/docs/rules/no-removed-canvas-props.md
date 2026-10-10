v10 removed several `<Canvas>` props and moved renderer-wide settings into the renderer settings
bag: `renderer={{ ... }}` on `@react-three/fiber`, `gl={{ ... }}` on `@react-three/fiber/legacy`.

| Prop                                                    | In v10                                  | Fix                              |
| ------------------------------------------------------- | --------------------------------------- | -------------------------------- |
| `shadows`                                               | throws                                  | 🔧 moved into the settings bag   |
| `textureColorSpace`                                     | ignored                                 | 🔧 moved into the settings bag   |
| `legacy`, `linear`, `flat`, `colorSpace`, `toneMapping` | ignored (passed to the wrapper `<div>`) | set the matching renderer option |
| `renderer={{ primaryCanvas }}`                          | throws                                  | `<Canvas primary>` on the owner  |
| `renderer={{ scheduler }}`                              | throws                                  | `<Canvas scheduler>`             |
| `<Canvas renderer>` (the boolean)                       | the default                             | 🔧 removed                       |

Only a `Canvas` imported from `@react-three/fiber` (or `/legacy`, `/webgpu`) is checked.

Part of the [`migration`](../../README.md#migration) config.

#### ❌ Incorrect

```js
import { Canvas } from '@react-three/fiber'
;<Canvas shadows flat renderer />
```

#### ✅ Correct

```js
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
;<Canvas renderer={{ shadows: true, toneMapping: THREE.NoToneMapping }} />
```
