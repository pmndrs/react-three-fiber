---
'@react-three/fiber': patch
---

Canvas and `root.configure()` now apply only the configuration props that changed. Runtime changes made through setters such as `setFrameloop`, or directly to `gl.shadowMap`, last through rerenders and resizes until their prop changes. The pixel ratio still follows `dpr` and the device pixel ratio on every render. Inline option objects compare by value. Changing `flat` or `linear` after creation now updates the renderer, unless `gl` sets `toneMapping` or `outputColorSpace` explicitly.

Configuration applies in call order, including calls made from a renderer factory or a store subscriber while another configuration is running.
