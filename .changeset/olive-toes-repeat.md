---
'@react-three/fiber': patch
---

fix: keep a root that was remounted during the unmount grace period alive.

`unmountComponentAtNode` defers its teardown by 500ms. A `<StrictMode>` remount happens well inside that window and reuses the same root, store, scene and GL context, so the deferred callback destroyed a live root — `forceContextLoss()` is permanent, which left the canvas blank for the rest of the session. It now bails out when the root is active again.
