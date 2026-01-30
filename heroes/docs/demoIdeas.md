# v10 Demo Ideas

> 30 demo concepts showcasing 2–5 new R3F v10 features each.
> Existing demos (BatterySaver, DepthSorting, EnvironmentMixer, ExportStudio, FlashlightMaze, FluidBottle, FrameBudget, GeometryPrep, GravityWell, HeadlightsDrive, LayeredReality, LazyCity, MagicMirror, MissionControl, MorphingGallery, OcclusionReveal, PianoKeys, ProceduralCoral, SecurityCameras, ShaderPlayground, SplitScreen, SpotlightRig, SyncedSwimmers, TerrainTable, VolumetricClouds) are excluded.

---

### 1. Aurora Borealis

Animated sky curtain using TSL noise nodes shared via **useNodes**, color driven by **useUniforms** with Leva sliders, camera looking up with **Portal**-attached snowflakes, and the whole scene wrapped in a **background preset** (`"night"`).

**Features:** useNodes, useUniforms, Portal, Canvas background prop

---

### 2. Radar Sweep

Top-down orthographic mini-map in a secondary canvas showing the same scene as the primary. Objects pulse when entering the frustum. Sweep line runs at 10 fps via scheduler throttling.

**Features:** Multi-Canvas Rendering, frustum (useThree), useFrame fps throttling, onFramed

---

### 3. Particle Fountain (Compute)

GPU compute particle system with positions and velocities in **useBuffers**, a gravity force field defined in **useNodes**, and a bloom post-process via **useRenderPipeline**. Particles fade when occluded.

**Features:** useBuffers, useNodes, useRenderPipeline, onOccluded

---

### 4. Day-Night Cycle

Single slider uniform controls sun angle, sky color, and shadow intensity. Environment transitions between presets using the **background** object form with `backgroundBlurriness`. Streetlights auto-enable via **onVisible**.

**Features:** useUniforms, Canvas background (object form), onVisible, useLocalNodes

---

### 5. Photo Mode

Render at 4K with **width/height** props, freeze physics with **useFrame pause/resume**, and toggle a vignette post-process on/off. A HUD overlay in a secondary canvas shows composition grid lines.

**Features:** Canvas width/height, useFrame pause/resume, useRenderPipeline, Multi-Canvas Rendering

---

### 6. Tilt-Shift Miniature

Depth-of-field blur applied via **useRenderPipeline** using depth from MRT. Blur amount controlled by a **useUniform** linked to pointer Y. Scene uses **once()** to center all geometries on mount.

**Features:** useRenderPipeline (MRT), useUniform, once()

---

### 7. Turntable Showcase

Product on a turntable with camera-attached rim lights via **Portal**. Rotation pauses on pointer down (scheduler pause). **fromRef** points a spotlight at the product. Background uses an HDR URL string.

**Features:** Portal, useFrame pause/resume, fromRef, Canvas background (URL)

---

### 8. Hologram Display

Wireframe mesh with TSL fresnel effect (**useNodes**), scan-line uniform (**useUniforms**), and a transparent HUD label attached to camera via **Portal**. **onFramed** hides the label when mesh leaves view.

**Features:** useNodes, useUniforms, Portal, onFramed

---

### 9. Interactive Globe

Spinning earth with **useLocalNodes** composing atmosphere glow from shared fresnel node. Country boundaries highlighted on hover via **per-pointer state**. Globe geometry rotated once on mount with **once(rotateX)**.

**Features:** useNodes, useLocalNodes, per-pointer state, once()

---

### 10. Porthole View

Render-to-texture scene visible through a circular mesh. FBO created via **useRenderTarget**. The porthole is camera-attached using **Portal**. Resolution adjustable via **setSize** imperative API.

**Features:** useRenderTarget, Portal, setSize imperative

---

### 11. Heat Map Terrain

Height data stored in **useGPUStorage** (StorageTexture), terrain color ramp defined in **useNodes**, height uniform from pointer via **useUniform**. Terrain tiles lazy-load based on **onFramed** frustum events.

**Features:** useGPUStorage, useNodes, useUniform, onFramed

---

### 12. Shadow Puppet Theater

Spotlight with **fromRef** targeting a puppet mesh. Camera-mounted point light via **Portal** provides fill. Puppet animation runs in **physics** phase, rendering in **render** phase. Background is a warm color.

**Features:** fromRef, Portal, useFrame phases, Canvas background

---

### 13. Crowd Simulation

Instanced agents with positions in **useBuffers**. Steering logic in **useFrame physics phase** at 20 fps. Agents outside frustum skip animation via **onFramed**. A bird's-eye secondary canvas shows all agents.

**Features:** useBuffers, useFrame fps + phases, onFramed, Multi-Canvas Rendering

---

### 14. Crystal Refraction

Refraction shader built with **useNodes** (shared IOR function), per-crystal tint via **useLocalNodes**. Back-face render target from **useRenderTarget**. Crystals centered with **once(center)**.

**Features:** useNodes, useLocalNodes, useRenderTarget, once()

---

### 15. Motion Blur Trail

Velocity MRT pass via **useRenderPipeline** setup callback. Trail intensity controlled by **useUniform**. Fast-moving objects flagged with **interactivePriority** so they stay clickable despite overlap.

**Features:** useRenderPipeline (MRT + setupCB), useUniform, interactivePriority

---

### 16. Weather Station

Multiple gauges (temp, wind, humidity) each using **useLocalNodes** to compose a shared arc-shader from **useNodes**. Values driven by **useUniforms** scoped per gauge. Gauges auto-hide via **onVisible** when a panel covers them.

**Features:** useNodes, useLocalNodes, useUniforms (scoped), onVisible

---

### 17. Underwater Caustics

Caustic pattern computed in **useGPUStorage** texture, projected onto geometry via **useLocalNodes**. Water surface color from **useUniforms** with Leva. Scene background is a blue color. Frustum culling pauses distant caustic updates.

**Features:** useGPUStorage, useLocalNodes, useUniforms, Canvas background, onFramed

---

### 18. Marble Run

Physics balls rolling down tracks. Physics in dedicated **useFrame phase**. Ball positions stored in **useBuffers**. Camera follows lead ball; headlight via **Portal**. Balls behind walls detected by **onOccluded** (WebGPU).

**Features:** useFrame phases, useBuffers, Portal, onOccluded

---

### 19. Pixel Art Exporter

Low-res scene rendered at exact pixel dimensions via **Canvas width/height** with `dpr={1}`. Pixelation post-process in **useRenderPipeline**. Export button uses **setSize** to temporarily go high-res.

**Features:** Canvas width/height, useRenderPipeline, setSize imperative, dpr control

---

### 20. Kaleidoscope

Reflection shader in **useNodes** with segment count from **useUniform**. Six render targets via **useRenderTarget** for mirror passes. Geometry pre-rotated with **once(rotateZ)**.

**Features:** useNodes, useUniform, useRenderTarget, once()

---

### 21. Fog of War

Visibility mask stored in **useGPUStorage** texture. Units update the mask in **useFrame physics phase**. Terrain shader reads mask via **useLocalNodes**. Hidden enemies trigger **onOccluded** to mute audio.

**Features:** useGPUStorage, useFrame phases, useLocalNodes, onOccluded

---

### 22. X-Ray Scanner

Two canvases: normal view and X-ray view sharing the same renderer. X-ray uses a custom shader from **useNodes** with inverted normals. Scanner position tracked by **useUniform** from pointer. **interactivePriority** ensures scanner handle stays clickable.

**Features:** Multi-Canvas Rendering, useNodes, useUniform, interactivePriority

---

### 23. Fireworks Display

Burst positions in **useBuffers**, spark color ramp in **useNodes**, bloom in **useRenderPipeline**. Launch timing uses **useFrame** at 10 fps; particle update at full speed. Background is `"night"` preset.

**Features:** useBuffers, useNodes, useRenderPipeline, useFrame fps throttling, Canvas background

---

### 24. Painting Canvas

Brush strokes accumulate into a **useGPUStorage** texture via compute. Brush size/color from **useUniforms** with Leva. Multi-touch draws independent strokes via **per-pointer state**. Export at high-res with **setSize**.

**Features:** useGPUStorage, useUniforms, per-pointer state, setSize imperative

---

### 25. Music Visualizer

Audio FFT data pushed into **useBuffers** each frame. Bar heights computed in **useLocalNodes** from shared smoothing node (**useNodes**). Beat flash uniform via **useUniform**. Bars outside view skip updates via **onFramed**.

**Features:** useBuffers, useNodes, useLocalNodes, useUniform, onFramed

---

### 26. Isometric Builder

Grid snapping in **useFrame input phase**, placement in **update phase**. Placed blocks use **once(center)** for geometry prep. Mini-map in secondary canvas with ortho camera. Block previews use **fromRef** for snap target.

**Features:** useFrame phases, once(), Multi-Canvas Rendering, fromRef

---

### 27. Cinematic Letterbox

Render pipeline adds letterbox bars and color grading via **useRenderPipeline**. Camera-attached letterbox planes via **Portal**. Film grain intensity from **useUniform**. Aspect ratio controlled by **Canvas width/height**.

**Features:** useRenderPipeline, Portal, useUniform, Canvas width/height

---

### 28. Erosion Simulator

Height field in **useGPUStorage**, water flow in **useBuffers**. Erosion step runs in **useFrame physics phase** at 15 fps. Terrain material composed in **useLocalNodes** reading both storage sources. Background is `"dawn"` preset.

**Features:** useGPUStorage, useBuffers, useFrame fps + phases, useLocalNodes, Canvas background

---

### 29. Stained Glass Window

Voronoi pattern in **useNodes**, per-panel tint via **useLocalNodes**. Light ray bloom in **useRenderPipeline**. Sun direction from **useUniform**. Glass panels pre-rotated with **once(rotateY)**.

**Features:** useNodes, useLocalNodes, useRenderPipeline, useUniform, once()

---

### 30. Touch Drum Pad

Grid of pads responding to independent touches via **per-pointer state**. Hit ripple shader from **useNodes**, pad glow uniform per scope via **useUniforms**. Visual feedback runs in **update phase**, audio trigger in **input phase**. Pads use **interactivePriority** to stay responsive over decorative overlays.

**Features:** per-pointer state, useNodes, useUniforms (scoped), useFrame phases, interactivePriority
