[![Build Status](https://img.shields.io/github/workflow/status/react-spring/drei/Release?style=flat&colorA=000000&colorB=000000)](https://github.com/react-spring/drei/releases)
[![Version](https://img.shields.io/npm/v/drei?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/drei)
[![Downloads](https://img.shields.io/npm/dt/drei.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/drei)
[![Discord Shield](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=ffffff)](https://discord.gg/ZZjjNvJ)


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

```bash
npm install drei
```

```jsx
import { ... } from 'drei'
```

#### Live Playground

For examples of _drei_ in action, visit [https://drei.react-spring.io/](https://drei.react-spring.io/)

Or, run the demo storybook on your computer:

```bash
git clone https://github.com/react-spring/drei
cd drei
npm install
npm run storybook
```

# Index

<table>
  <tr>
    <td>
      <ul>
        <li><a href="#cameras">Cameras</a></li>
        <ul>
          <li><a href="#perspectivecamera">PerspectiveCamera</a></li>
          <li><a href="#orthographiccamera">OrthographicCamera</a></li>
        </ul>
        <li><a href="#controls">Controls</a></li>
        <ul>
          <li><a href="#orbitcontrols">OrbitControls</a></li>
          <li><a href="#flycontrols">FlyControls</a></li>
          <li><a href="#mapcontrols">MapControls</a></li>
          <li><a href="#deviceorientationcontrols">DeviceOrientationControls</a></li>
          <li><a href="#trackballcontrols">TrackballControls</a></li>
          <li><a href="#transformcontrols">TransformControls</a></li>
        </ul>
        <li><a href="#abstractions">Abstractions</a></li>
        <ul>
          <li><a href="#text">Text</a></li>
          <li><a href="#line">Line</a></li>
          <li><a href="#detailed">Detailed</a></li>
          <li><a href="#positionalaudio">PositionalAudio</a></li>
          <li><a href="#billboard">Billboard</a></li>
        </ul>
        <li><a href="#shaders">Shaders</a></li>
        <ul>
          <li><a href="#meshwobblematerial">MeshWobbleMaterial</a></li>
          <li><a href="#meshdistortmaterial">MeshDistortMaterial</a></li>
          <li><a href="#sky">Sky</a></li>
          <li><a href="#stars">Stars</a></li>
          <li><a href="#softshadows">softShadows</a></li>
          <li><a href="#shadermaterial">shaderMaterial</a></li>
        </ul>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="#misc">Misc</a></li>
        <ul>
          <li><a href="#html">Html</a></li>
          <li><a href="#shadow">Shadow</a></li>
          <li><a href="#stats">Stats</a></li>
          <li><a href="#meshbounds">meshBounds</a></li>
          <li><a href="#usecamera">useCamera</a></li>
          <li><a href="#usehelper">useHelper</a></li>
          <li><a href="#useaspect">useAspect</a></li>
          <li><a href="#reflector">Reflector</a></li>
        </ul>
        <li><a href="#loaders">Loaders</a></li>
        <ul>
          <li><a href="#draco">draco</a></li>
          <li><a href="#usegltfloader">useGLTFLoader</a></li>
          <li><a href="#usetextureloader">useTextureLoader</a></li>
          <li><a href="#usecubetextureloader">useCubeTextureLoader</a></li>
          <li><a href="#useprogress">useProgress</a></li>
        </ul>
        <li><a href="#modifiers">Modifiers</a></li>
        <ul>
          <li><a href="#usesubdivision">useSubdivision</a></li>
          <li><a href="#usetessellation">useTessellation</a></li>
          <li><a href="#usesimplification">useSimplification</a></li>
        </ul>
        <li><a href="#prototyping">Prototyping</a></li>
        <ul>
          <li><a href="#loader">Loader</a></li>
        </ul>
      </ul>
    </td>
    <td>
      <ul>
        <li><a href="#shapes">Shapes</a></li>
        <ul>
          <li><a href="#plane">Plane</a></li>
          <li><a href="#box">Box</a></li>
          <li><a href="#sphere">Sphere</a></li>
          <li><a href="#circle">Circle</a></li>
          <li><a href="#cone">Cone</a></li>
          <li><a href="#cylinder">Cylinder</a></li>
          <li><a href="#tube">Tube</a></li>
          <li><a href="#torus">Torus</a></li>
          <li><a href="#torusknot">TorusKnot</a></li>
          <li><a href="#ring">Ring</a></li>
          <li><a href="#tetrahedron">Tetrahedron</a></li>
          <li><a href="#polyhedron">Polyhedron</a></li>
          <li><a href="#icosahedron">Icosahedron</a></li>
          <li><a href="#octahedron">Octahedron</a></li>
          <li><a href="#dodecahedron">Dodecahedron</a></li>
          <li><a href="#extrude">Extrude</a></li>
          <li><a href="#lathe">Lathe</a></li>
          <li><a href="#parametric">Parametric</a></li>
          <li><a href="#roundedbox">RoundedBox</a></li>
        </ul>
      </ul>
    </td>
  </tr>
</table>

# Exports

## Cameras

#### PerspectiveCamera [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-basic-demo-qgcrx)

A responsive [THREE.PerspectiveCamera](https://threejs.org/docs/index.html#api/en/cameras/PerspectiveCamera) that can set itself as the default.

```jsx
<PerspectiveCamera
  makeDefault // Registers it as the default camera system-wide (default=false)
  {...props} // All THREE.PerspectiveCamera props are valid
>
  <mesh />
</PerspectiveCamera>
```

#### OrthographicCamera [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-render-target-kdj94)

A responsive [THREE.OrthographicCamera](https://threejs.org/docs/index.html#api/en/cameras/OrthographicCamera) that can set itself as the default.

## Controls

If available controls have damping enabled by default, they manage their own updates, remove themselves on unmount, are compatible with the `invalidateFrameloop` canvas-flag. They inherit all props from their underlying [THREE controls](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/controls).

#### OrbitControls [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-contact-shadow-h5xcw)

#### MapControls [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-three-fiber-map-mkq8e)

#### TrackballControls

#### DeviceOrientationControls

#### TransformControls [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-transformcontrols-hc8gm)

## Shapes

Buffer-geometry short-cuts:

```jsx
<Plane args={[2, 2]} />
<Sphere>
  <meshBasicMaterial attach="material" color="hotpink" />
</Sphere>
```

#### Plane

#### Box

#### Sphere

#### Circle

#### Cone

#### Cylinder

#### Tube

#### Torus

#### TorusKnot

#### Ring

#### Tetrahedron

#### Polyhedron

#### Icosahedron

#### Octahedron

#### Dodecahedron

#### Extrude

#### Lathe

#### Parametric

#### RoundedBox

A box buffer geometry with rounded corners, done with extrusion.

```jsx
<RoundedBox
  args={[1, 1, 1]}  // Width, Height and Depth of the box
  radius={0.05}     // Border-Radius of the box
  smoothness={4}    // Optional, number of subdivisions
  {...meshProps}    // All THREE.Mesh props are valid
>
  <meshPhongMaterial attach="material" color="#f3f3f3" wireframe />
</RoundedBox>
```

## Abstractions

#### Text [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-troika-text-eb4mx)

Hi-quality text rendering w/ signed distance fields (SDF) and antialiasing, using [troika-3d-text](https://github.com/protectwise/troika/tree/master/packages/troika-3d-text). All of troikas props are valid!

```jsx
<Text
  color="black" // default
  anchorX="center" // default
  anchorY="middle" // default
>
  hello world!
</Text>
```

#### Line [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-line-7mtjx)

Renders a THREE.Line2.

```jsx
<Line
  points={[[0, 0, 0], ...]}       // Array of points
  color="black"                   // Default
  lineWidth={1}                   // In pixels (default)
  dashed={false}                  // Default
  vertexColors={[[0, 0, 0], ...]} // Optional array of RGB values for each point
  {...lineProps}                  // All THREE.Line2 props are valid
  {...materialProps}              // All THREE.LineMaterial props are valid
/>
```

#### Detailed [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-detailed-dep1v)

A wrapper around [THREE.LOD](https://threejs.org/docs/index.html#api/en/objects/LOD) (Level of detail).

```jsx
<Detailed
  distances={[0, 10, 20]} // Camera distances, correspends to the # of the children
  {...props} // All THREE.LOD props are valid
>
  <mesh geometry={highDetail} />
  <mesh geometry={mediumDetail} />
  <mesh geometry={lowDetail} />
</Detailed>
```

#### PositionalAudio [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-positionalaudio-yi1o0) ![](https://img.shields.io/badge/-suspense-brightgreen)

A wrapper around [THREE.PositionalAudio](https://threejs.org/docs/index.html#api/en/audio/PositionalAudio). Add this to groups or meshes to tie them to a sound that plays when the camera comes near.

```jsx
<PositionalAudio
  url="/sound.mp3" // Url of the sound file
  distance={1} // Camera distance (default=1)
  loop // Repat play (default=true)
  {...props} // All THREE.PositionalAudio props are valid
/>
```

#### StandardEffects

Standard Effects has been removed from drei in favour of (react-spring/react-postprocessing)[https://github.com/react-spring/react-postprocessing]

#### Billboard

Adds a `<Plane />` that always faces the camera.

```jsx
<Billboard
  follow={true} // Follow the camera (default=true)
  lockX={false} // Lock the rotation on the x axis (default=false)
  lockY={false} // Lock the rotation on the y axis (default=false)
  lockZ={false} // Lock the rotation on the z axis (default=false)
/>
```

## Shaders

#### MeshWobbleMaterial [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-sky-g5373)

This material makes your geometry wobble and wave around. It was taken from the [threejs-examples](https://threejs.org/examples/#webgl_materials_modified) and adapted into a self-contained material.

```jsx
<mesh>
  <boxBufferGeometry attach="geometry" />
  <MeshWobbleMaterial
    attach="material"
    factor={1} // Strength, 0 disables the effect (default=1)
    speed={10} // Speed (default=1)
  />
</mesh>
```

#### MeshDistortMaterial

This material makes your geometry distort following simplex noise.

```jsx
<mesh>
  <boxBufferGeometry attach="geometry" />
  <MeshDistortMaterial
    attach="material"
    distort={1} // Strength, 0 disables the effect (default=1)
    speed={10} // Speed (default=1)
  />
</mesh>
```

#### Sky [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-sky-3q4ev)

Adds a [sky](https://threejs.org/examples/webgl_shaders_sky.html) to your scene.

```jsx
<Sky
  distance={450000} // Camera distance (default=450000)
  sunPosition={[0, 1, 0]} // Sun position normal (default=[0, 1, 0])
  {...props} // All three/examples/jsm/objects/Sky props are valid
/>
```

#### Stars [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-sky-m2ci7)

Adds a blinking shader-based starfield to your scene.

```jsx
<Stars
  radius={100} // Radius of the inner sphere (default=100)
  depth={50} // Depth of area where stars should fit (default=50)
  count={5000} // Amount of stars (default=5000)
  factor={4} // Size factor (default=4)
  saturation={0} // Saturation 0-1 (default=0)
  fade // Faded dots (default=false)
/>
```

#### softShadows [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-soft-shadows-dh2jc)

Injects [percent closer soft shadows (pcss)](https://threejs.org/examples/?q=pcss#webgl_shadowmap_pcss) into threes shader chunk.

```jsx
softShadows({
  frustrum: 3.75, // Frustrum width (default: 3.75)
  size: 0.005, // World size (default: 0.005)
  near: 9.5, // Near plane (default: 9.5)
  samples: 17, // Samples (default: 17)
  rings: 11, // Rings (default: 11)
})
```

#### shaderMaterial [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-shader-material-yltgr)

Creates a THREE.ShaderMaterial for you with easier handling of uniforms, which are also automatically declared as setter/getters on the object.

```jsx
import { extend } from "react-three-fiber"
import glsl from "babel-plugin-glsl/macro"

const ColorShiftMaterial = shaderMaterial(
  { time: 0, color: new THREE.Color(0.2, 0.0, 0.1) },
  // vertex shader
  glsl`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
  glsl`
    uniform float time;
    uniform vec3 color;
    varying vec2 vUv;
    void main() {
      gl_FragColor.rgba = vec4(0.5 + 0.3 * sin(vUv.yxx + time) + color, 1.0);
    }
  `
)

extend({ ColorShiftMaterial })

<mesh>
  <colorShiftMaterial attach="material" color="hotpink" time={1} />
```

## Misc

#### Html [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-suspense-zu2wo)

Allows you to tie HTML content to any object of your scene. It will be projected to the objects whereabouts automatically.

```jsx
<Html
  prepend // Project content behind the canvas (default: false)
  center // Adds a -50%/-50% css transform (default: false)
  fullscreen // Aligns to the upper-left corner, fills the screen (default:false)
  scaleFactor={10} // If set (default: undefined), children will be scaled by this factor, and also by distance to a PerspectiveCamera.
  zIndexRange={[100, 0]} // Z-order range (default=[16777271, 0])
  portal={domnodeRef} // Reference to target container (default=undefined)
  {...groupProps} // All THREE.Group props are valid
  {...divProps} // All HTMLDivElement props are valid
>
  <h1>hello</h1>
  <p>world</p>
</Html>
```

#### Reflector [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/jolly-benz-pmk9j)

Easily add reflection to any object

```jsx
<Reflector>
  <planeBufferGeometry args={[2, 5]} attach="geometry" />
</Reflector>
```

#### Shadow [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-render-target-t5fv8)

A cheap canvas-texture-based circular gradient.

```jsx
<Shadow
  color="black" // Color (default:black)
  colorStop={0} // First gradient-stop (default:0)
  opacity={0.5} // Alpha (default:0.5)
  fog={false} // Reacts to fog (default=false)
/>
```

#### Stats [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-drei-stats-8p4ph)

Adds [stats](https://github.com/mrdoob/stats.js/) to document.body. It takes over the render-loop!

```jsx
<Stats
  showPanel={0} // Start-up panel (default=0)
  className="stats" // Optional className to add to the stats container dom element
  {...props} // All stats.js props are valid
/>
```

You can choose to mount Stats to a different DOM Element - for example, for custom styling:

```jsx
const node = useRef(document.createElement('div'))

useEffect(() => {
  node.current.id = 'test'
  document.body.appendChild(node.current)

  return () => document.body.removeChild(node.current)
}, [])

return <Stats parent={parent} />
```

#### meshBounds [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-basic-demo-8fpip)

A very fast, but often good-enough bounds-only raycast for meshes. You can use this if performance has precidence over pointer precision.

```jsx
<mesh raycast={meshBounds} />
```

#### useCamera [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-three-fiber-viewcube-py4db)

A hook for the rare case when you are using non-default cameras for heads-up-displays or portals, and you need events/raytracing to function properly (raycasting uses the default camera otherwise).

```jsx
<mesh raycast={useCamera(customCamera)} />
```

#### useHelper [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-use-helper-ly6kw)

A hook for a quick way to add helpers to existing nodes in the scene. It handles removal of the helper on unmount and auto-updates it by default.

```jsx
const mesh = useRef()
useHelper(mesh, BoxHelper, 'cyan')
```

#### useAspect

This hook calculates aspect ratios (for now only what in css would be `image-size: cover` is supported). You can use it to make an image fill the screen. It is responsive and adapts to viewport resize. Just give the hook the image bounds in pixels. It returns an array: `[width, height, 1]`.

```jsx
const scale = useAspect(
  "cover",                  // Aspect ratio: cover | ... more to come, PR's welcome ;)
  1024,                     // Pixel-width
  512,                      // Pixel-height
  1                         // Optional scaling factor
)
return (
  <mesh scale={scale}>
    <planeBufferGeometry />
    <meshBasicMaterial map={imageTexture} />
```

## Modifiers

#### useSubdivision [![](https://img.shields.io/badge/-storybook-%23ff69b4)](https://drei.react-spring.io/?path=/story/modifiers-usesubdivision)

This hook mutates a mesh geometry using [three's Subdivision modifier](https://threejs.org/examples/webgl_modifier_subdivision.html). 

👉 Vertex count is quadrupled for each subdivision.

```jsx
const meshRef = useSubdivision(4)

return (
  <mesh ref={meshRef}>
    <boxBufferGeometry args={[10, 10]} />
  </mesh>
)
```

#### useSimplification [![](https://img.shields.io/badge/-storybook-%23ff69b4)](https://drei.react-spring.io/?path=/story/modifiers-usesimplification)

This hook mutates a mesh geometry using [three's Simplification modifier](https://threejs.org/examples/webgl_modifier_subdivision.html). 

👉 The simplification code is based on [this algorithm](http://www.melax.com/polychop/).

```jsx
const meshRef = useSimplification(0.5) // the vertices will be halved

return (
  <mesh ref={meshRef}>
    <octahedronBufferGeometry args={[2, 5]} />
  </mesh>
)
```


#### useTessellation [![](https://img.shields.io/badge/-storybook-%23ff69b4)](https://drei.react-spring.io/?path=/story/modifiers-usetessellation)

This hook mutates a mesh geometry using [three's Tessellation modifier](hhttps://threejs.org/examples/?q=tess#webgl_modifier_tessellation). It will break-up faces withe edge longer than the maxEdgeLength parameter.

```jsx
const meshRef = useTessellation(
  2, // passes - number of times the geometry will be subdivided
  8, // maxEdgeLength - faces with edges longer than this number will be broken up
) 

return (
  <mesh ref={meshRef}>
    <octahedronBufferGeometry args={[2, 2]} />
  </mesh>
)
```

## Loaders

#### useGLTFLoader

A convenience hook that uses `useLoader`, `GLTFLoader` and `draco`:

```jsx
useGLTFLoader(
  url,
  true // use draco binaries in /draco-gltf/
)

useGLFTLoader(
  url,
  '/my-draco-binaries' // use draco binaries from a custom path
)
```

#### useTextureLoader

A convenience hook that uses `useLoader` and `TextureLoader`

```jsx
const texture = useTextureLoader(url)

const [texture1, texture2] = useTextureLoader([texture1, texture2])
```

#### useCubeTextureLoader

A convenience hook that uses `useLoader` and `CubeTextureLoader`

```jsx
const envMap = useCubeTextureLoader(
  ['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'], 
  { path: 'cube/' }
)
```

#### draco [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/r3f-contact-shadow-h5xcw)

Adds the Draco extension to your GLTFLoader, to be used in conjuction with `useLoader` and `GLTFLoader` when more control is needed.

```jsx
useLoader(
  GLTFLoader,
  url,
  draco(
    '/draco-gtltf/' // Path to the Draco binaries (default='/draco-gtltf/')
  )
)
```

#### useProgress [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/cranky-newton-k7f9x)

A convenience hook that wraps `THREE.DefaultLoadingManager`'s progress status.

```jsx
function Loader() {
  const { active, progress, errors, item, loaded, total } = useProgress()
  return <Html center>{progress} % loaded</Html>
}

<Suspense fallback={<Loader />}>
  <AsyncModels />
</Suspense>
```

If you don't want your progress component to re-render on all changes you can be specific as to what you need, for instance if the component is supposed to collect errors only. Look into [zustand](https://github.com/react-spring/zustand) for more info about selectors. 

```jsx
const errors = useProgress(state => state.errors)
```

👉 Note that your loading component does not have to be a suspense fallback. You can use it anywhere, even in your dom tree, for instance for overlays.

## ⚡️ Prototyping

#### Loader

A quick and easy loading overlay component that you can drop on top of your canvas. It will show an animated loadingbar and a percentage.

```jsx
<Canvas>
  <Suspense fallback={null}>
    <AsyncModels />
  </Suspense>
</Canvas>
<Loader />
```

You can override styles, too.

```jsx
<Loader 
  containerStyles={...container} // Flex layout styles
  innerStyles={...inner} // Inner container styles
  barStyles={...bar} // Loading-bar styles
  dataStyles={...data} // Text styles
  dataInterpolation={(p) => `Loading ${p.toFixed(2)}%`} // Text
  initialState={(active) => active} // Initial black out state
>
```

---
<a href="https://www.netlify.com">
  <img src="https://www.netlify.com/img/global/badges/netlify-color-bg.svg" alt="Deploys by Netlify" />
</a>
