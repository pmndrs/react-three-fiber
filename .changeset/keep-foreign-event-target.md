---
'@react-three/fiber': patch
---

Stop `Canvas` from taking events back from a target someone else connected. Since 9.8, every re-render reconnected events to the canvas's own target whenever the store held a different one, so drei's `ScrollControls` lost its scroll container and scrolling did nothing. `Canvas` now reconnects only when its own target changes, such as an `eventSource` ref attaching late.
