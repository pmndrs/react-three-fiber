---
'@react-three/fiber': patch
---

fix: don't resurrect a `<Canvas>` root that unmounts before its render settles.

`<Canvas>` configured its root asynchronously. When the canvas was unmounted between that effect and the microtasks it queued, for example by a spring reparenting it through a synchronous state update from a layout effect, the stale continuation still rendered into the torn-down root. Its Provider then mounted again and called `events.connect` with the unmounted wrapper `div`, throwing `Cannot read properties of null (reading 'addEventListener')`, and the resurrected root leaked a live WebGL context.

The scene now commits inside the canvas' own commit, a deferred render bails once the root is claimed for teardown, and `unmountComponentAtNode` waits for a configure still in flight so the renderer it creates is disposed rather than orphaned.
