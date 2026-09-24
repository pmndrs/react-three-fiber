---
'@react-three/fiber': patch
---

fix: keep a Canvas root alive while `<Activity>` hides it.

React destroys a hidden `<Activity>` tree's effects but keeps its DOM. The Canvas unmounted its root in that effect cleanup, which lost the WebGL context and disposed the scene. When the tree was shown again, the Canvas still held the unmounted root and stayed blank.

Canvas now keeps its renderer and scene state while hidden. A Canvas removed while hidden still releases its renderer.
