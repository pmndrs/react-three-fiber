---
'@react-three/fiber': patch
---

Native: dispatch one pointer event per changed touch, and `pointercancel` when another view takes the gesture. When two fingers changed in the same frame, the second finger's event was lost, so controls such as `OrbitControls` kept a stale pointer and later pinches jumped or stopped responding.
