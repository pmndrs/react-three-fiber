# Breaking changes in v10

Everything that can break an app or library moving from `@react-three/fiber` v9 to v10, in one
list. Each entry says what to do; the [migration guide](./docs/migration/v10.mdx) has the detail
and examples, and [`CHANGELOG-ALPHA.md`](./CHANGELOG-ALPHA.md) has the history per alpha.

Most of these fail loudly: a prop that moved throws an error naming its new place. The ones marked
**silent** change behaviour or types without an error, so check for them.

## Renderer and entries

| Change                                                                                                                                                                                                          | What to do                                                                                                                                                                                                             | Since   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **`@react-three/fiber` renders with WebGPU.** `<Canvas>` and `createRoot` use `WebGPURenderer` (with a WebGL2 backend where the browser has no WebGPU). `WebGLRenderer` is only on `@react-three/fiber/legacy`. | Keep the import if your scene uses standard materials. Import `Canvas` / `createRoot` from `@react-three/fiber/legacy` for GLSL `ShaderMaterial`s, `onBeforeCompile`, `postprocessing` and other WebGL-only libraries. | alpha.6 |
| **silent:** a GLSL material (`ShaderMaterial`, `RawShaderMaterial`) on a WebGPU canvas renders as a blank default material; `onBeforeCompile` is ignored.                                                       | Use `/legacy`, or port the shader to a node material (TSL). R3F warns once per material type in development.                                                                                                           | alpha.6 |
| `gl={...}` on a `@react-three/fiber` Canvas throws: it configures `WebGLRenderer`.                                                                                                                              | Use `/legacy`, or move the settings to `renderer={{ ... }}` for WebGPU.                                                                                                                                                | alpha.6 |
| **Types:** `useThree`, `useFrame`, `useRenderTarget` and `Canvas`'s `onCreated` from `@react-three/fiber` are typed for `WebGPURenderer`, and its JSX map is `three/webgpu`.                                    | Nothing for most apps (WebGPU members need no cast now). Code typed against the WebGL renderer imports from `/legacy`. Libraries that run on both type against `@react-three/fiber/extension`.                         | alpha.6 |
| `@react-three/fiber/webgpu` and `@react-three/test-renderer/webgpu` are deprecated, removed in the first beta.                                                                                                  | Import from `@react-three/fiber` and `@react-three/test-renderer`.                                                                                                                                                     | alpha.6 |
| `state.gl` is deprecated. On a WebGPU canvas it aliases the `WebGPURenderer`, with a one-time notice.                                                                                                           | Use `state.renderer`. Code calling WebGL-only APIs on `gl` needs `/legacy`.                                                                                                                                            | alpha.1 |
| React Native moved to its own package.                                                                                                                                                                          | `@react-three/fiber/native` → `@react-three/native`.                                                                                                                                                                   | alpha.1 |

## Dependencies

| Change                                               | What to do                                    | Since   |
| ---------------------------------------------------- | --------------------------------------------- | ------- |
| `three` peer is `>=0.185.0`.                         | Upgrade three (r181–r184 cannot install v10). | alpha.3 |
| `react` / `react-dom` peer is `>=19.0 <19.4`.        | React 19.0–19.3.                              | alpha.3 |
| `@react-three/drei` has no release for fiber 10 yet. | Expect peer warnings during the alpha.        | —       |

## Canvas props

| Change                                                                                                      | What to do                                                                                    | Since   |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------- |
| `shadows` moved into the renderer settings; the Canvas prop throws.                                         | `renderer={{ shadows }}` (WebGPU) or `gl={{ shadows }}` (`/legacy`).                          | alpha.6 |
| `legacy`, `linear`, `flat`, `colorSpace` and `toneMapping` Canvas props are removed.                        | Pass `outputColorSpace` / `toneMapping` in `renderer` or `gl`. Color management is always on. | alpha.3 |
| `textureColorSpace` is not a Canvas prop.                                                                   | Put it in the `renderer` / `gl` bag.                                                          | alpha.3 |
| `onUpdate` is removed.                                                                                      | An effect keyed on the props, `useFrame`, or a ref callback.                                  | alpha.6 |
| **silent:** the default shadow type is `PCFShadowMap` (three made it soft; `'soft'` is a deprecated alias). | Nothing, unless you relied on `PCFSoftShadowMap` by name.                                     | alpha.3 |
| `<color attach="background">` is deprecated.                                                                | The `background` Canvas prop.                                                                 | alpha.3 |

## Frame loop

| Change                                                                                                                                                           | What to do                                                                                                            | Since   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------- |
| `state.clock` is removed.                                                                                                                                        | `state.time`, `state.delta`, `state.elapsed`.                                                                         | alpha.1 |
| **silent:** a `physics`-phase job runs on a fixed 1/60 timestep: zero or more times a frame, always with `delta === 1/60`.                                       | Step by the `delta` you get; per-frame work goes in another phase. `setPhaseTimestep('physics', undefined)` opts out. | alpha.6 |
| **silent:** numeric `useFrame` priority runs higher numbers first (v9 ran lower first), so negative numbers reverse. Positive numbers still take over rendering. | Use phases or `{ before, after }`; `{ phase: 'render' }` for render takeover. Both forms warn.                        | alpha.1 |
| **silent:** pointer-move raycasts run once per frame (`events.frameTimedRaycasts: true`).                                                                        | Set it to `false` for per-event raycasts.                                                                             | alpha.3 |
| **silent:** the default camera is a child of `scene`, shifting `scene.children` indices by one.                                                                  | Find objects by reference or name, not index.                                                                         | alpha.3 |

## Assets and textures

| Change                                                                                                   | What to do                                                 | Since   |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------- |
| Split gain map environments (`['sdr.webp', 'gainmap.webp', 'metadata.json']`) are no longer read.        | A single-file Ultra HDR `.jpg`, or drei's `<Environment>`. | alpha.6 |
| **silent:** `useTexture` caches by default (`{ cache: true }`); textures live until disposed.            | `{ cache: false }` per call to opt out.                    | alpha.3 |
| `useTextures()` returns `all` (was `textures`); `addMultiple`, `remove*` and `disposeMultiple` are gone. | Use `all`, `add`, and refcounted `dispose`.                | alpha.3 |

## TypeScript and testing

| Change                                                                 | What to do                                                                                           | Since   |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------- |
| `act` is no longer re-exported.                                        | `import { act } from 'react'`.                                                                       | alpha.3 |
| `advance()` takes only `(timestamp)`.                                  | Drop the extra arguments.                                                                            | alpha.3 |
| `Mutable<P>` uses `-readonly`; `ObjectMap` is generic.                 | Affects code naming these types directly.                                                            | alpha.3 |
| `@react-three/test-renderer`'s default entry mocks WebGPU.             | Test `/legacy` scenes with `@react-three/test-renderer/legacy`.                                      | alpha.6 |
| `@react-three/eslint-plugin` exports flat configs; `eslint` is a peer. | `configs.recommended` in `eslint.config.js`; eslintrc uses `plugin:@react-three/legacy-recommended`. | alpha.6 |

## Upgrading from an earlier v10 alpha

On top of the above, alpha users also meet these changes to APIs that only existed in the alphas:

- **TSL hooks moved to `@react-three/tsl`** (`useUniforms`, `useUniform`, `useNodes`, `useLocalNodes`,
  `useBuffers`, `useGPUStorage`, `useRenderPipeline`, `rebuildAll*`); the standalone utilities
  (`removeUniforms(set, …)`, `clearScope`, `clearRootUniforms`, `removeNodes(set, …)`, `clearNodeScope`,
  `clearRootNodes`) are removed. _alpha.6_
- **`useLocalNodes` with no dependency array re-runs every render**; pass `[]` for the old memoised
  behaviour. _alpha.6_
- **Multi-canvas is configured on the Canvas.** `renderer={{ primaryCanvas }}` and
  `renderer={{ scheduler }}` throw: use `<Canvas primary>`, `share`, and `<Canvas scheduler>`. _alpha.6_
- **`<Canvas renderer>` is the same as `<Canvas>`** on `@react-three/fiber`; a plain `<Canvas>` that
  was on WebGL is now on WebGPU. _alpha.6_
- **`usePostProcessing` → `useRenderPipeline`**, and `state.postProcessing` → `state.renderPipeline`. _alpha.3_
- **`RenderTargetCompat` → `R3FRenderTarget`, `ThreeElementsImpl` → `ThreeElementsOf<T>`**, and no entry
  calls `extend(THREE)` at import time. _alpha.6_
