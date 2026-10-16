# @react-three/tsl

## 10.0.0-alpha.6

First release. Full detail is in
[`CHANGELOG-ALPHA.md`](../../CHANGELOG-ALPHA.md#1000-alpha6) at the repo root.

### Major Changes

- The TSL resource hooks move here from `@react-three/fiber/webgpu`: `useUniforms`, `useUniform`,
  `useNodes`, `useLocalNodes`, `useBuffers`, `useGPUStorage`, `useRenderPipeline` and the
  `rebuildAll*` helpers. The API is the same apart from `useRenderPipeline` (next entry). The
  package also adds `state.uniforms`, `state.nodes`, `state.buffers`, `state.gpuStorage`,
  `state.renderPipeline` and `state.passes` to `RootState`. It builds on `@react-three/fiber/extension`, so it adds no second copy of fiber to an app.
- `useRenderPipeline` belongs to the component that configures it: unmounting that component frees
  its pipeline and scene pass. `{ persist: true }` keeps it rendering after unmount. A call without
  callbacks only reads and no longer creates a pipeline. StrictMode and Fast Refresh remounts keep
  the pipeline instead of building a second scene pass (#4029).

### Minor Changes

- Uniforms, nodes, buffers and GPU storage typed by name through a `Register` interface, strict by
  default, and `configureTSL({ uniforms, scopes })` to create registered uniforms on every primary
  canvas up front.
- Unregistered reads by name are `LooseUniformNode` / `LooseNode`, which TSL accepts without casts
  (`uTime.mul(2)`, `material.colorNode = uColor`). Writing a concrete node straight into
  `state.uniforms` or `state.nodes` with `setState` now needs a cast (#4027).
- `useLocalNodes` takes a dependency array, re-runs only when a resource its creator read changes,
  and has an install form that returns a function to run after commit.
- A texture `useTexture` loads is visible to a later `useLocalNodes` creator in the same render.

### Patch Changes

- Secondary canvases share the primary's TSL maps; `useUniform` registers on the primary.
- Reader forms (`useUniforms()`, `useNodes('scope')`, ...) see entries a parent declares in the same
  render, so a child no longer builds from `undefined` on its first render.
- `useUniform(name, value)` tracks `value`, and TSL constant inputs keep three's exact uniform node
  types.
