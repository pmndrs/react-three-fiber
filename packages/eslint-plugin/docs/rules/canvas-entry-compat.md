Which renderer a `<Canvas>` uses is decided by where it is imported from: `@react-three/fiber`
renders with `WebGPURenderer` (with a WebGL2 fallback backend), and `@react-three/fiber/legacy`
with `WebGLRenderer`. Some props and materials only work with one of them. This rule reports the
combinations that throw or silently fail.

On a `<Canvas>`:

| Combination                                               | What happens                                   |
| --------------------------------------------------------- | ---------------------------------------------- |
| `gl` on a Canvas from `@react-three/fiber` (or `/webgpu`) | throws: `gl` configures `WebGLRenderer`        |
| `renderer` on a Canvas from `/legacy`                     | throws: `renderer` configures `WebGPURenderer` |
| `gl` and `renderer` together                              | throws                                         |
| `primary` or `share="id"` on a Canvas from `/legacy`      | throws: renderer sharing is WebGPU-only        |
| `primary` with `share="id"`                               | throws: a primary owns its renderer            |

In a file that renders its own `<Canvas>` (so the renderer is known):

| Combination                                                         | What happens                                               |
| ------------------------------------------------------------------- | ---------------------------------------------------------- |
| a node material (`<meshStandardNodeMaterial>`, ...) on `/legacy`    | throws: WebGL cannot compile node materials                |
| `<shaderMaterial>` or `<rawShaderMaterial>` on `@react-three/fiber` | draws a blank default material: WebGPU cannot compile GLSL |
| `onOccluded` or `onVisible` on `/legacy`                            | never fires: occlusion queries need WebGPU                 |

Components in other files are not checked against a Canvas they do not import.

#### ❌ Incorrect

```js
import { Canvas } from '@react-three/fiber'
;<Canvas gl={{ antialias: false }} />
```

```js
import { Canvas } from '@react-three/fiber/legacy'
;<Canvas>
  <mesh>
    <meshStandardNodeMaterial colorNode={colorNode} />
  </mesh>
</Canvas>
```

#### ✅ Correct

```js
import { Canvas } from '@react-three/fiber'
;<Canvas renderer={{ antialias: false }} />
```

```js
import { Canvas } from '@react-three/fiber/legacy'
;<Canvas gl={{ antialias: false }}>
  <mesh>
    <shaderMaterial vertexShader={vertexShader} fragmentShader={fragmentShader} />
  </mesh>
</Canvas>
```
