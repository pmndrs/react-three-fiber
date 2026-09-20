# Root entry namespace

`index.ts` is the THREE namespace the root entry registers as JSX elements: `three/webgpu` plus the
WebGL classes it does not export. It exists only because that merged namespace needs `export *` to
stay tree-shakeable. The legacy and WebGPU entries register `three` and `three/webgpu` directly.

Core never imports from here. It takes three's shared core from `three` and receives the
renderer-specific classes from the entry's provider (see `types/provider.d.ts`), so this namespace
is reachable only through the root entry's `createRoot` and `Canvas`.

📖 **Full documentation:** [`docs/development/BUILD.md`](../../../../docs/development/BUILD.md)
