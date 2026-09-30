## '@react-three/fiber': patch

Fix multi-canvas: a secondary borrowing the primary's renderer no longer changes renderer-wide state. Its first configure used to apply its own `shadows` setting, the sRGB/ACES defaults, and its `renderer` props to the primary's shared renderer, and every secondary mount added WebXR session listeners to the primary's renderer that were never removed. Renderer-wide settings and XR wiring now come from the owner alone; a WebGL2-fallback secondary (which owns its renderer) is unaffected.
