---
'@react-three/fiber': patch
---

fix: dispose the renderer R3F creates when its root unmounts.

Teardown only called `forceContextLoss()`, never `dispose()`. A `WebGPURenderer` built in a `gl` factory, which has no `forceContextLoss`, was never released at all: its GPU device and every allocation on it outlived the canvas. A `WebGLRenderer` lost its context while three's listener was still attached, which logged `THREE.WebGLRenderer: Context Lost.` on every unmount.

A renderer R3F builds, from its defaults, a props object or a factory, is now disposed, and then its context is lost. A renderer passed in as an instance keeps its previous teardown. Each teardown step now runs on its own, so one that throws no longer skips the rest.
