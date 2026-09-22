---
'@react-three/fiber': minor
---

feat: configure and render roots synchronously; suspend on async renderers.

`root.configure()` now runs synchronously unless `gl` is an async factory (WebGPU), and the first `root.render()` mounts synchronously once the root is configured; later renders are batched as before. The returned promises carry a `status` field that React's `use` reads, and every root exposes `ready`, which is pending only while an async renderer is being created.

`<Canvas>` uses this to commit its scene inside its own layout effect, so `onCreated` runs while the wrapper is mounted and the events are connected before the browser paints. With an async renderer the canvas suspends on `root.ready` internally, without showing a parent fallback, and mounts once it resolves. Unmounting meanwhile never renders the scene. A renderer factory that fails now reaches the nearest error boundary instead of an unhandled rejection.

Configure calls made while another is in flight are applied after it, in order. The `flushSync` caveats apply to that first `root.render()` when it is called from inside another root's commit.
