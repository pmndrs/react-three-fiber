---
'@react-three/fiber': patch
---

fix: prevent TypeError when events.connect is called with a null target, e.g. when the canvas wrapper ref is momentarily null during DOM reparenting
