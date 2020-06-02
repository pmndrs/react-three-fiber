[![Build Status](https://travis-ci.org/react-spring/drei.svg?branch=master)](https://travis-ci.org/react-spring/drei) [![npm version](https://badge.fury.io/js/drei.svg)](https://badge.fury.io/js/drei) ![npm](https://img.shields.io/npm/dt/drei.svg)

<p align="center">
    <img width="500" src="https://imgur.com/arDsXO6.jpg" alt="logo" />
</p>

A growing collection of useful helpers and abstractions for [react-three-fiber](https://github.com/react-spring/react-three-fiber), saving you some boilerplate.

If you find yourself repeating set-up code often and if it's generic enough, add it here, everyone benefits!

#### Requirements

- Types
- ForwardRefs if possible, so that objects can be referenced back
- Invalidate frames on any movement for those using invalidateFrameloop
- Cleanup on unmount, no left-overs, restore previous states

```
yarn add drei
```

```jsx
import { ... } from 'drei'
```

# Index

- Cameras
  - `<PerspectiveCamera/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-basic-demo-qgcrx)
  - `<OrthographicCamera/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-render-target-kdj94)
- Controls
  - `<OrbitControls/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-contact-shadow-h5xcw)
  - `<MapControls/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-three-fiber-map-mkq8e)
  - `<TrackballControls/>`
  - `<TransformControls/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-transformcontrols-hc8gm)
- Shapes
  - `<Plane/>`, `<Box/>`, `<Sphere/>`, `<Circle/>`, `<Cone/>`, `<Cylinder/>`, `<Tube/>`, `<Torus/>`, `<TorusKnot/>`, `<Ring/>`, `<Tetrahedron/>`, `<Polyhedron/>`, `<Icosahedron/>`, `<Octahedron/>`, `<Dodecahedron/>`, `<Extrude/>`, `<Lathe/>`, `<Parametric/>`
- Abstractions
  - `<Text/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-troika-text-eb4mx)
  - `<Detailed/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-detailed-dep1v)
  - `<PositionalAudio/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-positionalaudio-yi1o0) ![](https://img.shields.io/badge/-suspense-brightgreen)
  - `<StandardEffects/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-standardeffects-frcmm) ![](https://img.shields.io/badge/-suspense-brightgreen) ![](https://img.shields.io/badge/-useFrame-red)
- Shaders
  - `<MeshWobbleMaterial/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-sky-g5373)
  - `<Sky/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-sky-3q4ev)
  - `<Stars/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-sky-m2ci7)
  - `softShadows()` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-soft-shadows-dh2jc)
- Misc
  - `<HTML/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-suspense-zu2wo)
  - `<Shadow/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-render-target-t5fv8)
  - `<Stats/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-stats-8p4ph) ![](https://img.shields.io/badge/-useFrame-red)
  - `draco()` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-contact-shadow-h5xcw)
  - `meshBounds()` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-basic-demo-8fpip)
  - `useCamera()` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-three-fiber-viewcube-py4db)
  - `useHelper()` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-use-helper-ly6kw) ![](https://img.shields.io/badge/-useFrame-red)
  - `useAspect()`

# Exports

## Cameras

##### ⚡️ `<PerspectiveCamera/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-basic-demo-qgcrx)

A responsive [THREE.PerspectiveCamera](https://threejs.org/docs/index.html#api/en/cameras/PerspectiveCamera) that can set itself as the default.

```jsx
<PerspectiveCamera
  makeDefault               // Registers it as the default camera system-wide (default=false)
  {...props}                // All THREE.PerspectiveCamera props are valid
>
  <mesh />
</PerspectiveCamera>
```

##### ⚡️ `<OrthographicCamera/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-render-target-kdj94)

A responsive [THREE.OrthographicCamera](https://threejs.org/docs/index.html#api/en/cameras/OrthographicCamera) that can set itself as the default.

## Controls

If available controls have damping enabled by default, they manage their own updates, remove themselves on unmount, are compatible with the `invalidateFrameloop` canvas-flag. They inherit all props from their underlying [THREE controls](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/controls).

##### ⚡️ `<OrbitControls/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-contact-shadow-h5xcw)

##### ⚡️ `<MapControls/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-three-fiber-map-mkq8e)

##### ⚡️ `<TrackballControls/>`

##### ⚡️ `<TransformControls/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-transformcontrols-hc8gm)

## Shapes

Buffer-geometry short-cuts:

```jsx
<Plane args={[2, 2]} />
<Sphere>
  <meshBasicMaterial attach="material" color="hotpink" />
</Sphere>
```

##### ⚡️ `<Plane/>`, `<Box/>`, `<Sphere/>`, `<Circle/>`, `<Cone/>`, `<Cylinder/>`, `<Tube/>`, `<Torus/>`, `<TorusKnot/>`, `<Ring/>`, `<Tetrahedron/>`, `<Polyhedron/>`, `<Icosahedron/>`, `<Octahedron/>`, `<Dodecahedron/>`, `<Extrude/>`, `<Lathe/>`, `<Parametric/>`

## Abstractions

##### ⚡️ `<Text/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-troika-text-eb4mx)

Hi-quality text rendering w/ signed distance fields (SDF) and antialiasing, using [troika-3d-text](https://github.com/protectwise/troika/tree/master/packages/troika-3d-text). All of troikas props are valid! 

```jsx
<Text
  color="black"             // default
  anchorX="center"          // default
  anchorY="middle"          // default
>
  hello world!
</Text>
```

##### ⚡️ `<Detailed`> [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-detailed-dep1v)

A wrapper around [THREE.LOD](https://threejs.org/docs/index.html#api/en/objects/LOD) (Level of detail).

```jsx
<Detailed
  distances={[0, 10, 20]}   // Camera distances, correspends to the # of the children
  {...props}                // All THREE.LOD props are valid
>
  <mesh geometry={highDetail} />
  <mesh geometry={mediumDetail} />
  <mesh geometry={lowDetail} />
</Detailed>
```

##### ⚡️ `<PositionalAudio/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-positionalaudio-yi1o0) ![](https://img.shields.io/badge/-suspense-brightgreen)

A wrapper around [THREE.PositionalAudio](https://threejs.org/docs/index.html#api/en/audio/PositionalAudio). Add this to groups or meshes to tie them to a sound that plays when the camera comes near.

```jsx
<PositionalAudio
  url="/sound.mp3"          // Url of the sound file
  distance={1}              // Camera distance (default=1)
  loop                      // Repat play (default=true)
  {...props}                // All THREE.PositionalAudio props are valid
/>
```

##### ⚡️ `<StandardEffects/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-standardeffects-frcmm) ![](https://img.shields.io/badge/-suspense-brightgreen) ![](https://img.shields.io/badge/-useFrame-red)

Adds [ambient-occlusion](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SSAOEffect.js~SSAOEffect.html#instance-constructor-constructor), [bloom](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/BloomEffect.js~BloomEffect.html#instance-constructor-constructor) and SMAA using the [postprocessing](https://github.com/vanruesc/postprocessing) library.

⚠️ AO relies on the depthbuffer! Make sure your near and far clipping planes are narrow enough, or use `<Canvas gl={{ logarithmicDepthBuffer: true }} .../>`.

```jsx
<StandardEffects
  smaa                      // Can be a boolean (default=true)
  ao                        // Can be a boolean or all valid postprocessing AO props (default=true)
  bloom                     // Can be a boolean or all valid postprocessing Bloom props (default=true)
  edgeDetection={0.1}       // SMAA precision (default=0.1)
  bloomOpacity={1}          // Bloom blendMode opacity (default=1)
  effects={() => [...fx]}   // Define your own: ([smaa, ao, bloom]) => [...effects] (default=undefined)
/>
```

## Shaders

##### ⚡️ `<MeshWobbleMaterial/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-sky-g5373)

This material makes your geometry wobble and wave around. It was taken from the [threejs-examples](https://threejs.org/examples/#webgl_materials_modified) and adapted into a self-contained material.

```jsx
<mesh>
  <boxBufferGeometry attach="geometry" />
  <MeshWobbleMaterial
    attach="material"
    factor={1}              // Strength, 0 disables the effect (default=1)
    speed={10}              // Speed (default=1)
  />
</mesh>
```

##### ⚡️ `<Sky/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-sky-3q4ev)

Adds a [sky](https://threejs.org/examples/webgl_shaders_sky.html) to your scene.

```jsx
<Sky
  distance={450000}         // Camera distance (default=450000)
  sunPosition={[0, 1, 0]}   // Sun position normal (default=[0, 1, 0])
  {...props}                // All three/examples/jsm/objects/Sky props are valid
/>
```

##### ⚡️ `<Stars/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-sky-m2ci7)

Adds a blinking shader-based starfield to your scene.

```jsx
<Stars
  radius={100}              // Radius of the inner sphere (default=100)
  depth={50}                // Depth of area where stars should fit (default=50)
  count={5000}              // Amount of stars (default=5000)
  factor={4}                // Size factor (default=4)
  saturation={0}            // Saturation 0-1 (default=0)
  fade                      // Faded dots (default=false)
/>
```

#### ⚡️ `softShadows()` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-soft-shadows-dh2jc)

Injects [percent closer soft shadows (pcss)](https://threejs.org/examples/?q=pcss#webgl_shadowmap_pcss) into threes shader chunk.

```jsx
softShadows({
  frustrum: 3.75,           // Frustrum width (default: 3.75)
  size: 0.005,              // World size (default: 0.005)
  near: 9.5,                // Near plane (default: 9.5)
  samples: 17,              // Samples (default: 17)
  rings: 11,                // Rings (default: 11)
})
```

## Misc

#### ⚡️ `<HTML/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-suspense-zu2wo)

Allows you to tie HTML content to any object of your scene. It will be projected to the objects whereabouts automatically.

```jsx
<HTML
  prepend                   // Project content behind the canvas (default: false)
  center                    // Adds a -50%/-50% css transform (default: false)
  fullscreen                // Aligns to the upper-left corner, fills the screen (default:false)
  scaleFactor={10}          // Scales children if set to a number (default=undefined)
  zIndexRange={[100, 0]}    // Z-order range (default=[16777271, 0])
  portal={domnodeRef}       // Reference to target container (default=undefined)
  {...groupProps}           // All THREE.Group props are valid
  {...divProps}             // All HTMLDivElement props are valid
>
  <h1>hello</h1>
  <p>world</p>
</HTML>
```

#### ⚡️ `<Shadow/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-render-target-t5fv8)

A cheap canvas-texture-based circular gradient.

```jsx
<Shadow
  color="black"             // Color (default:black)
  colorStop={0}             // First gradient-stop (default:0)
  opacity={0.5}             // Alpha (default:0.5)
  fog={false}               // Reacts to fog (default=false)
/>
```

#### ⚡️ `<Stats/>` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-stats-8p4ph) ![](https://img.shields.io/badge/-useFrame-red)

Adds [stats](https://github.com/mrdoob/stats.js/) to document.body. It takes over the render-loop!

```jsx
<Stats
  showPanel={0}             // Start-up panel (default=0)
  className='stats'         // Optional className to add to the stats container dom element
  {...props}                // All stats.js props are valid
/>
```

##### ⚡️ `draco()` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-contact-shadow-h5xcw)

Adds the Draco extension to your GLTFLoader.

```jsx
useLoader(
  GLTFLoader,
  url,
  draco(
    '/draco-gtltf/'         // Path to the Draco binaries (default='/draco-gtltf/')
  )
)
```

##### ⚡️ `meshBounds()` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-basic-demo-8fpip)

A very fast, but often good-enough bounds-only raycast for meshes. You can use this if performance has precidence over pointer precision.

```jsx
<mesh raycast={meshBounds} />
```

##### ⚡️ `useCamera()` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-three-fiber-viewcube-py4db)

A hook for the rare case when you are using non-default cameras for heads-up-displays or portals, and you need events/raytracing to function properly (raycasting uses the default camera otherwise).

```jsx
<mesh raycast={useCamera(customCamera)} />
```

##### ⚡️ `useHelper()` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-use-helper-ly6kw)

A hook for a quick way to add helpers to existing nodes in the scene. It handles removal of the helper on unmount and auto-updates it by default.

```jsx
const mesh = useRef()
useHelper(mesh, BoxHelper, "cyan")
```

##### ⚡️ `useAspect()`

This hook calculates aspect ratios (for now only what in css would be `image-size: cover` is supported). You can use it to make an image fill the screen. It is responsive and adapts to viewport resize. Just give the hook the image bounds in pixels. It returns an array: `[width, height, 1]`.

```jsx
const scale = useAspect(
  "cover"                   // Aspect ratio: cover | ... more to come, PR's welcome ;)
  1024,                     // Pixel-width
  512,                      // Pixel-height
  1                         // Optional scaling factor
)
return (
  <mesh scale={scale}>
    <planeBufferGeometry />
    <meshBasicMaterial map={imageTexture} />
```
