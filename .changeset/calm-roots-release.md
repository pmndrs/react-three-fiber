---
'@react-three/fiber': patch
---

Stop the frame loop from retaining an unmounted root: `loop` and `update` no longer keep the last root state and frame subscribers in module-level variables, so a disposed canvas and renderer can be garbage collected.
