# Index

- [Fundamentals](#fundamentals)
- [Canvas](#canvas)
- [Objects and properties](#objects-and-properties)
- [Automatic disposal](#automatic-disposal)
- [Events](#events)
- [Hooks](#hooks)
  - [useThree](#useThree)
  - [useFrame](#useFrame)
  - [useResource](#useResource)
  - [useUpdate](#useUpdate)
  - [useLoader (experimental!)](<#useLoader-(experimental!)>)
- [Additional exports](#additional-exports)

# Fundamentals

1. Before you start, make sure you have a [basic grasp of Threejs](https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene).
2. When you know what a scene is, a camera, mesh, geometry and material, more or less, fork the [frontpages demo sandbox](https://github.com/react-spring/react-three-fiber#what-does-it-look-like), try some of the things you learn here out.
3. Don't break your head, react-three-fiber is Threejs, it does not introduce new rules or assumptions. If you see a snippet somewhere and you don't know how to make it declarative, use it 1:1 as it is.

Some reading material:

- Robert Borghesi's ([@dghez\_](https://twitter.com/dghez_)) [Alligator.io tutorial](https://alligator.io/react/react-with-threejs)
- [Threejs-fundamentals](https://threejsfundamentals.org)
- [Discover Threejs](https://discoverthreejs.com)
- [Do's and don'ts](https://discoverthreejs.com/tips-and-tricks) for performance and best practices
- [Threejs-examples](https://threejs.org/examples)

# Canvas

The `Canvas` object is your portal into Threejs. It renders Threejs elements, _not DOM elements_! It stretches to 100% of the next relative/absolute parent-container. Make sure your canvas is given space to show contents!

```jsx
<Canvas
  children                      // Either a function child (which receives state) or regular children
  gl                            // Props that go into the default webGL-renderer
  camera                        // Props that go into the default camera
  raycaster                     // Props that go into the default raycaster
  shadowMap                     // Props that go into gl.shadowMap, can also be set true for PCFsoft
  colorManagement = false       // Auto sRGBEncoding encoding for all colors and textures + ACESFilmic
  vr = false                    // Switches renderer to VR mode, then uses gl.setAnimationLoop
  gl2 = false                   // Enables webgl2
  concurrent = false            // Enables React concurrent mode
  resize = undefined            // Resize config, see react-use-measure's options
  orthographic = false          // Creates an orthographic camera if true
  noEvents = false              // Switch off raytracing and event support
  pixelRatio = undefined        // You could provide window.devicePixelRatio if you like
  invalidateFrameloop = false   // When true it only renders on changes, when false it's a game loop
  updateDefaultCamera = true    // Adjusts default camera on size changes
  onCreated                     // Callback when vdom is ready (you can block first render via promise)
  onPointerMissed />            // Response for pointer clicks that have missed a target
```

You can give it additional properties like style and className, which will be added to the container (a div) that holds the dom-canvas element.

### Defaults that the canvas component sets up

Canvas will create a _translucent WebGL-renderer_ with the following properties: `antialias, alpha, setClearAlpha(0)`

A default _perspective camera_: `fov: 75, near: 0.1, far: 1000, z: 5, lookAt: [0,0,0]`

A default _orthographic camera_ if Canvas.orthographic is true: `near: 0.1, far: 1000, z: 5, lookAt: [0,0,0]`

A default _shadowMap_ if Canvas.shadowMap is true: `type: PCFSoftShadowMap`

A default _scene_ (into which all the JSX is rendered) and a _raycaster_.

A _wrapping container_ with a [resize observer](https://github.com/react-spring/react-use-measure): `scroll: true, debounce: { scroll: 50, resize: 0 }`

You do not have to use any of these objects, look under "Recipes" down below if you want to bring your own.

# Objects and properties

You can use [Threejs's entire object catalogue and all properties](https://threejs.org/docs). When in doubt, always consult the docs.

You could lay out an object like this:

```jsx
<mesh
  visible
  userData={{ test: 'hello' }}
  position={new THREE.Vector3(1, 2, 3)}
  rotation={new THREE.Euler(0, 0, 0)}
  geometry={new THREE.SphereGeometry(1, 16, 16)}
  material={new THREE.MeshBasicMaterial({ color: new THREE.Color('hotpink'), transparent: true })}
/>
```

The problem is that all of these properties will always be re-created. Instead, you should define properties declaratively.

```jsx
<mesh visible userData={{ test: 'hello' }} position={[1, 2, 3]} rotation={[0, 0, 0]}>
  <sphereGeometry attach="geometry" args={[1, 16, 16]} />
  <meshStandardMaterial attach="material" color="hotpink" transparent />
</mesh>
```

#### Shortcuts (set)

All properties that have a `.set()` method can be given a shortcut. For example [THREE.Color.set](https://threejs.org/docs/index.html#api/en/math/Color.set) can take a color string, hence instead of `color={new THREE.Color('hotpink')}` you can do `color="hotpink"`. Some `set` methods take multiple arguments ([THREE.Vector3.set](https://threejs.org/docs/index.html#api/en/math/Vector3.set)), so you can pass an array `position={[100, 0, 0]}`.

#### Shortcuts and non-Object3D stow-away

Stow away non-Object3D primitives (geometries, materials, etc) into the render tree so that they become managed and reactive. They take the same properties they normally would, constructor arguments are passed with `args`. Using the `attach` property objects bind automatically to their parent and are taken off it once they unmount.

You can nest primitive objects, too:

```jsx
<meshBasicMaterial attach="material">
  <texture attach="map" image={img} onUpdate={self => img && (self.needsUpdate = true)} />
```

Sometimes attaching isn't enough. For example, this code attaches effects to an array called "passes" of the parent `effectComposer`. Note the use of `attachArray` which adds the object to the target array and takes it out on unmount:

```jsx
<effectComposer>
  <renderPass attachArray="passes" scene={scene} camera={camera} />
  <glitchPass attachArray="passes" renderToScreen />
```

You can also attach to named parent properties using `attachObject={[target, name]}`, which adds the object and takes it out on unmount. The following adds a buffer-attribute to parent.attributes.position.

```jsx
<bufferGeometry attach="geometry">
  <bufferAttribute attachObject={['attributes', 'position']} count={v.length / 3} array={v} itemSize={3} />
```

#### Piercing into nested properties

If you want to reach into nested attributes (for instance: `mesh.rotation.x`), just use dash-case:

```jsx
<mesh rotation-x={1} material-uniforms-resolution-value={[1 / size.width, 1 / size.height]} />
```

#### Putting already existing objects into the scene-graph

You can use the `primitive` placeholder for that. You can still give it properties or attach nodes to it. Never add the same object multiples times, this is not allowed in Threejs!

```jsx
const mesh = new THREE.Mesh()
return <primitive object={mesh} position={[0, 0, 0]} />
```

#### Using 3rd-party (non THREE namespaced) objects in the scene-graph

The `extend` function extends three-fibers catalogue of known native JSX elements.

```jsx
import { extend } from 'react-three-fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
extend({ EffectComposer, RenderPass }) < effectComposer > <renderPass />
```

# Automatic disposal

Freeing resources is a [manual chore in Threejs](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects), but react is aware of object-lifecycles, hence three-fiber will attempt to free resources for you by calling `object.dispose()` (if present) on all unmounted objects.

If you manage assets by yourself, globally or in a cache, this may _not_ be what you want. You can recursively switch it off:

```jsx
const globalGeometry = new THREE.BoxBufferGeometry()
const globalMaterial = new THREE.MeshBasicMatrial()

function Mesh() {
  return <mesh geometry={globalGeometry} material={globalMaterial} dispose={null} />
```

# Events

Threejs objects that implement their own `raycast` method (meshes, lines, etc) can be interacted with by declaring events on the object. We support pointer events ([you need to polyfill them yourself](https://github.com/jquery/PEP)), clicks and wheel-scroll. Events contain the browser event as well as the Threejs event data (object, point, distance, etc).

Additionally there's a special `onUpdate` that is called every time the object gets fresh props, which is good for things like `self => (self.verticesNeedUpdate = true)`.

```jsx
<mesh
  onClick={(e) => console.log('click')}
  onWheel={(e) => console.log('wheel spins')}
  onPointerUp={(e) => console.log('up')}
  onPointerDown={(e) => console.log('down')}
  onPointerOver={(e) => console.log('over')}
  onPointerOut={(e) => console.log('out')}
  onPointerEnter={(e) => console.log('enter')}
  onPointerLeave={(e) => console.log('leave')}
  onPointerMove={(e) => console.log('move')}
  onUpdate={(self) => console.log('props have been updated')}
/>
```

#### Event data

```jsx
({
  ...DomEvent                   // All the original event data
  ...ThreeEvent                 // All of Three's intersection data
  intersects: Intersect[]       // All intersects
  object: Object3D              // The object that was actually hit
  eventObject: Object3D         // The object that registered the event
  unprojectedPoint: Vector3     // Camera-unprojected point
  ray: Ray                      // The ray that was used to strike the object
  camera: Camera                // The camera that was used in the raycaster
  sourceEvent: DomEvent         // A reference to the host event
  delta: number                 // Initial-click delta
}) => ...
```

#### Propagation and capturing

```jsx
  onPointerDown={e => {
    // Only the mesh closest to the camera will be processed
    e.stopPropagation()
    // You may optionally capture the target
    e.target.setPointerCapture(e.pointerId)
  }}
  onPointerUp={e => {
    e.stopPropagation()
    // Optionally release capture
    e.target.releasePointerCapture(e.pointerId)
  }}
```

# Hooks

Hooks can only be used **inside** the Canvas element because they rely on context! You cannot expect something like this to work:

```jsx
function App() {
  const { size } = useThree() // This will just crash
  return (
    <Canvas>
      <mesh>
```

Do this instead:

```jsx
function SomeComponent() {
  const { size } = useThree()
  return <mesh />
}

function App() {
  return (
    <Canvas>
      <SomeComponent />
```

#### useThree

```jsx
useThree(): SharedCanvasContext
```

This hooks gives you access to all the basic objects that are kept internally, like the default renderer, scene, camera. It also gives you the current size of the canvas in screen and viewport coordinates. The hook is reactive, if you resize the browser, for instance, and you get fresh measurements, same applies to any of the defaults you can change.

```jsx
import { useThree } from 'react-three-fiber'

const {
  gl, // WebGL renderer
  scene, // Default scene
  camera, // Default camera
  raycaster, // Default raycaster
  size, // Bounds of the view (which stretches 100% and auto-adjusts)
  viewport, // Bounds of the viewport in 3d units + factor (size/viewport)
  aspect, // Aspect ratio (size.width / size.height)
  mouse, // Current, centered, normalized 2D mouse coordinates
  raycaster, // Intternal raycaster instance
  clock, // THREE.Clock (useful for useFrame deltas)
  invalidate, // Invalidates a single frame (for <Canvas invalidateFrameloop />)
  intersect, // Calls onMouseMove handlers for objects underneath the cursor
  setDefaultCamera, // Sets the default camera
} = useThree()
```

#### useFrame

```jsx
useFrame((callback: (state, delta) => void), (renderPriority: number = 0))
```

This hooks calls you back every frame, which is good for running effects, updating controls, etc. You receive the state (same as useThree) and a clock delta. If you supply a render priority greater than zero it will switch off automatic rendering entirely, you can then control rendering yourself. If you have multiple frames with a render priority then they are ordered highest priority last, similar to the web's z-index. Frames are managed, three-fiber will remove them automatically when the component that holds them is unmounted.

Updating controls:

```jsx
import { useFrame } from 'react-three-fiber'

const controls = useRef()
useFrame((state) => controls.current.update())
return <orbitControls ref={controls} />
```

Taking over the render-loop:

```jsx
useFrame(({ gl, scene, camera }) => gl.render(scene, camera), 1)
```

#### useResource

```jsx
useResource((optionalRef = undefined))
```

Take advantage of React's `useRef` with the added consideration of rendering when a component is available (e.g. in the next frame). Useful when you want to share and re-use resources across components.

```jsx
import { useResource } from 'react-three-fiber'

const [ref, material] = useResource()
return (
  <meshBasicMaterial ref={ref} />
  {material && (
    <mesh material={material} />
    <mesh material={material} />
    <mesh material={material} />
  )}
)
```

#### useUpdate

```jsx
useUpdate(callback, dependencies, (optionalRef = undefined))
```

When objects need to be updated imperatively.

```jsx
import { useUpdate } from 'react-three-fiber'

const ref = useUpdate(
  (geometry) => {
    geometry.addAttribute('position', getVertices(x, y, z))
    geometry.attributes.position.needsUpdate = true
  },
  [x, y, z] // execute only if these properties change
)
return <bufferGeometry ref={ref} />
```

#### useLoader (experimental!)

```jsx
useLoader(loader, url: string | string[], extensions?)
```

This hooks loads assets and suspends for easier fallback- and error-handling. If you need to lay out GLTF's declaratively check out [gltfjsx](https://github.com/react-spring/gltfjsx).

```jsx
import React, { Suspense } from 'react'
import { useLoader } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

function Asset({ url }) {
  const gltf = useLoader(GLTFLoader, url)
  return <primitive object={gltf.scene} dispose={null} />
}

;<Suspense fallback={<Cube />}>
  <Asset url="/spaceship.gltf" />
</Suspense>
```

You can provide a callback if you need to configure your loader:

```jsx
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

useLoader(GLTFLoader, url, (loader) => {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco-gltf/')
  loader.setDRACOLoader(dracoLoader)
})
```

It can also make multiple requests in parallel:

```jsx
const [bumpMap, specMap, normalMap] = useLoader(TextureLoader, [url1, url2, url2])
```

# Additional exports

```jsx
import {
  addEffect, // Adds a global callback which is called each frame
  addTail, // Adds a global callback which is called when rendering stops
  invalidate, // Forces view global invalidation
  extend, // Extends the native-object catalogue
  createPortal, // Creates a portal (it's a React feature for re-parenting)
  render, // Internal: Renders three jsx into a scene
  unmountComponentAtNode, // Internal: Unmounts root scene
  applyProps, // Internal: Sets element properties
} from 'react-three-fiber'
```
