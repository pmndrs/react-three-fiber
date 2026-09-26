---
'@react-three/fiber': patch
---

fix: follow devicePixelRatio changes when the canvas moves to another display or the page is zoomed.

Neither resizes the canvas, so nothing re-rendered it and the `dpr` prop stayed resolved against the old ratio: blurry on a denser display, four times the pixels on a coarser one. Roots now watch the ratio and re-resolve the prop the same way a re-render does. A fixed `dpr` is unaffected and never touches `matchMedia`, changes during an XR session apply once it ends, and environments without a working `matchMedia`, such as test setups with a partial mock, behave as before.
