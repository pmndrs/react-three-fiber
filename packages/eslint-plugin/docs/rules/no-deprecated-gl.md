v10 renamed the root state's `gl` to `renderer`, since it holds a `WebGPURenderer` as often as a
`WebGLRenderer`. `gl` still works: on a WebGPU canvas it is the `WebGPURenderer` and logs a one-time
deprecation notice, and on `@react-three/fiber/legacy` it is the `WebGLRenderer` with no notice.
`renderer` is the same object on every entry.

The rule reports `gl` read from the frame state (`useFrame`), a `useThree` selector, or the state
`useThree()` returns, and fixes it: `state.gl` becomes `state.renderer`, and `{ gl }` becomes
`{ renderer: gl }` so the local name stays.

Part of the [`migration`](../../README.md#migration) config.

#### ❌ Incorrect

```js
const { gl } = useThree()
const domElement = useThree((state) => state.gl.domElement)
useFrame(({ gl, scene, camera }) => gl.render(scene, camera), { phase: 'render' })
```

#### ✅ Correct

```js
const { renderer } = useThree()
const domElement = useThree((state) => state.renderer.domElement)
useFrame(({ renderer, scene, camera }) => renderer.render(scene, camera), { phase: 'render' })
```
