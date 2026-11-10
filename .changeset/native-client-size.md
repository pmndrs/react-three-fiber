---
'@react-three/fiber': patch
---

Native: report the canvas `clientWidth`/`clientHeight` in points instead of drawing buffer pixels. Touch locations are in points, so controls such as `OrbitControls` and `MapControls`, which divide touch deltas by the client size, panned and rotated `PixelRatio` times too slowly.
