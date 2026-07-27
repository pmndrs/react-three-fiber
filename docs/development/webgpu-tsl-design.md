# WebGPU / TSL Design Notes

Contributor-facing design rationale for the WebGPU TSL hooks. These are intentions and background, not published usage docs. For usage, see the published WebGPU section under `docs/webgpu/`.

## RenderPipeline

RenderPipeline is a main-level component within Three.js. It was originally exported as `PostProcessing`; three r183 renamed it to `RenderPipeline`. R3F's peer floor is `three >= 0.185`, so `useRenderPipeline` constructs `THREE.RenderPipeline` directly — the `PostProcessing` fallback that bridged the rename has been removed.

The expectation is that `EffectComposer` and very complex hand-written passes will become less common. Shared `Fn` nodes and TSL workflows should become the norm. Rather than another library of complex passes, the goal is a collection of pass nodes plus small utilities to glue them together - a base for users _or_ libraries to build on.

## `useRenderPipeline` intent

The hook does a lot behind the scenes:

- Calling it at all creates a `renderPipeline` object, places it on R3F state, and creates a default `ScenePass`.
- It accepts two callbacks: a main callback (run after creation) and a setup callback (run pre-creation, e.g. to set MRT).
- It exposes full access to nodes and uniforms, like the other hooks.
- Passes are isolated in their own records on state.
- Multiple inits are discouraged because of race conditions - prefer a single pipeline manager near the root.

### outputNode is deliberate

You **must** set `outputNode` if you change away from the default `scenePass`. Doing this automatically was considered and rejected: changing the pipeline output is a deliberate action and should be explicit, so the API does not infer it for you.

### No auto-rerun on HMR (deliberate)

The render-pipeline callbacks intentionally do **not** re-run on plain HMR (same scene/camera). Re-running them rebuilds the TSL node graph, which can corrupt cached references (e.g. `SkinningNode`). Callbacks only run on first creation, when scene/camera actually change, or when `rebuild()` is called explicitly. This is the opposite of the node/uniform hooks, which do refresh on HMR. See the published note in [`docs/webgpu/render-pipeline.mdx`](../webgpu/render-pipeline.mdx) and [`docs/webgpu/hmr.mdx`](../webgpu/hmr.mdx).
