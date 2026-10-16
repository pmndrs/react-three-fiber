# @react-three/tsl

## 10.0.0-alpha.6

First release. Full detail is in
[`CHANGELOG-ALPHA.md`](../../CHANGELOG-ALPHA.md#1000-alpha6) at the repo root.

### Major Changes

- The TSL resource hooks move here from `@react-three/fiber/webgpu`: `useUniforms`, `useUniform`,
  `useNodes`, `useLocalNodes`, `useBuffers`, `useGPUStorage`, `useRenderPipeline` and the
  `rebuildAll*` helpers, with the same API. The package also adds `state.uniforms`, `state.nodes`,
  `state.buffers`, `state.gpuStorage`, `state.renderPipeline` and `state.passes` to `RootState`. It
  builds on `@react-three/fiber/extension`, so it adds no second copy of fiber to an app.

### Minor Changes

- Uniforms typed by name through a `Register` interface, strict by default, and
  `configureTSL({ uniforms, scopes })` to create registered uniforms on every primary canvas up
  front.
- `useLocalNodes` takes a dependency array, re-runs only when a resource its creator read changes,
  and has an install form that returns a function to run after commit.
- A texture `useTexture` loads is visible to a later `useLocalNodes` creator in the same render.

### Patch Changes

- Secondary canvases share the primary's TSL maps; `useUniform` registers on the primary.
- `useUniform(name, value)` tracks `value`, and TSL constant inputs keep three's exact uniform node
  types.
