---
'@react-three/fiber': patch
---

fix: keep a Canvas root alive while `<Activity>` hides it.

React destroys a hidden `<Activity>` tree's effects but keeps its DOM. The Canvas unmounted its root in that effect cleanup, which lost the WebGL context and disposed the scene. When the tree was shown again, the Canvas still held the unmounted root and stayed blank.

The root is now only torn down once the canvas has left the document, which is how v10 tells a real unmount from a hidden or replayed one. A real unmount still releases it.
