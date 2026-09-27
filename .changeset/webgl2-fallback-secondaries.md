---
'@react-three/fiber': patch
---

Fix multi-canvas under the WebGL2 fallback: a secondary no longer shares the primary's renderer (a WebGL context is bound to the canvas element it was created on) and instead creates its own, so it renders into its own canvas instead of drawing the secondary scene into the primary's canvas and staying blank.
