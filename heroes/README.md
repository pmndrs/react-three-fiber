# R3F v10 Hero Demos

A collection of 25 showcase demos demonstrating the new features in React Three Fiber v10.

## Quick Start

```bash
cd heroes
pnpm install
pnpm dev
```

Open http://localhost:3000 to view the demo gallery.

## Features Demonstrated

### WebGPU & TSL Shaders

- WebGPU Support via `@react-three/fiber/webgpu`
- useNodes, useLocalNodes for TSL shaders
- useUniforms for declarative uniform management
- useRenderPipeline for post-processing
- useBuffers for compute storage
- HMR support for shader development

### New Scheduler

- Phase-based execution (input, physics, update, preRender, render)
- FPS throttling with `{ fps: 30 }`
- Pause/resume control
- before/after constraints

### Multi-Canvas Rendering

- Shared renderer between canvases
- Independent fps per canvas
- primaryStore access for cross-canvas rendering

### Camera & Scene

- Camera scene parenting
- Portal component for camera children
- Frustum access and controls

### Visibility Events

- onFramed for frustum enter/exit
- onOccluded for GPU occlusion queries (WebGPU)
- onVisible for combined visibility state

### Prop Utilities

- fromRef() for deferred ref resolution
- once() for mount-only transforms

### Canvas Configuration

- background prop for declarative backgrounds
- width/height for fixed resolution
- Enhanced setSize with ownership model

## Demo Categories

### Tier 1: High Impact

1. **Layered Reality** - Multi-canvas with HTML between 3D layers
2. **HL2 Fluid Bottle** - TSL compute shader fluid simulation
3. **Volumetric Cloudscape** - 3D noise raymarching
4. **Flashlight Maze** - Camera parenting with onOccluded
5. **Mission Control** - Multi-canvas HUD system

### Tier 2: Strong Demos

6. **Terrain Table** - Procedural terrain with scheduler phases
7. **Piano Keys** - Multi-touch interaction
8. **Security Cameras** - useRenderTarget multi-viewport
9. **Magic Mirror** - Portal with render target reflection
10. **Morphing Gallery** - fromRef spotlight targets

### Tier 3: Feature-Focused

11. **Frame Budget Visualizer** - Scheduler debugging tool
12. **Lazy City** - Visibility events for performance
13. **Depth Sorting Demo** - interactivePriority
14. **4K Export Studio** - Canvas size control
15. **Environment Mixer** - Background prop presets

### Tier 4: Creative/Artistic

16. **Synced Swimmers** - Multi-canvas with delay
17. **Shader Playground** - HMR TSL editor
18. **Occlusion Reveal** - onOccluded mechanics
19. **Procedural Coral** - Compute shader growth
20. **Gravity Well** - Particle compute simulation

### Tier 5: Quick Wins

21. **fromRef Spotlight Rig** - Declarative light targeting
22. **Geometry Prep** - once() utility demo
23. **Battery Saver Mode** - FPS throttling
24. **Headlights Drive** - Camera-attached lights
25. **Split Screen Racing** - Multi-canvas gaming

## Project Structure

```
heroes/
├── docs/
│   └── v10-features-list.md   # Comprehensive feature reference
├── src/
│   ├── main.tsx               # App entry point
│   ├── App.tsx                # Router and demo registry
│   ├── demos/                 # Individual demo folders
│   │   ├── LayeredReality/
│   │   ├── FluidBottle/
│   │   └── ...
│   └── shared/
│       └── utils.ts           # Shared utilities
└── public/
    └── assets/                # Static assets
```

## Tech Stack

- React 19
- @react-three/fiber v10 (workspace link)
- @react-three/drei
- Three.js (WebGPU build)
- Vite 6
- TypeScript
- Leva (controls)

## Browser Requirements

For full WebGPU support:

- Chrome 113+
- Edge 113+
- Firefox (behind flag)
- Safari Technology Preview

WebGL fallback available via `/legacy` entry point.

## Development

Each demo is self-contained in its own folder under `src/demos/`. To add a new demo:

1. Create a folder: `src/demos/YourDemo/`
2. Add `index.tsx` with default export component
3. Register in `src/App.tsx` demos array and lazy imports

## Documentation

See `docs/v10-features-list.md` for the comprehensive feature reference including:

- All new features with descriptions
- Usage examples
- Migration guide from v9
- Breaking changes
