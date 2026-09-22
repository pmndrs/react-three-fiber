---
'@react-three/fiber': patch
---

fix: unmount roots deterministically instead of after a 500ms timer.

`unmountComponentAtNode` deferred disposal by 500ms. A `<StrictMode>` remount lands inside that window and reuses the same root, store, scene and GL context, so the deferred callback destroyed a live root. `forceContextLoss()` is permanent, which left the canvas blank for the rest of the session.

Unmounting now claims the root and runs the teardown through React once the unmounted tree's effect cleanups have flushed. Using the root again through `configure` or `render` before then cancels it. A root that is unmounted, remounted and unmounted again is torn down exactly once.
