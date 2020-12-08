# API

You need to be versed in both React and Threejs before rushing into this. If you are unsure about React consult the official [React docs](https://reactjs.org/docs/getting-started.html), especially [the section about hooks](https://reactjs.org/docs/hooks-intro.html). As for Threejs, make sure you at least glance over the [fundamentals](https://github.com/pmndrs/react-three-fiber#fundamentals) section on the main-page, know at least the very basics: composition, scenes, cameras, controls, lights, meshes, materials. Vector-math, shaders and all that complicated stuff can come later.

If you have never used Threejs before, you might want to learn it through this library and React, as it will help you to focus on Threejs itself without having to go through boilerplate that has little to do with it.

## Table of Contents
- [Canvas](#canvas)
- [Objects, properties and constructor arguments](#objects-properties-and-constructor-arguments)
- [Automatic disposal](#automatic-disposal)
- [Events](#events)
- [Hooks](#hooks)
  - [useThree](#useThree)
  - [useFrame](#useFrame)
  - [useResource](#useResource)
  - [useUpdate](#useUpdate)
  - [useLoader](#useloader)
  - [useGraph](#useGraph)
- [Additional exports](#additional-exports)
- [Gotchas](#gotchas)

# Canvas

The `Canvas` object is your portal into Threejs. It renders Threejs elements, _not DOM elements_! Here is a small hello-world that you can try out:

```jsx
import ReactDOM from 'react-dom'
import React from 'react'
import { Canvas } from 'react-three-fiber'

ReactDOM.render(
  <Canvas>
    <pointLight position={[10, 10, 10]} />
    <mesh>
      <sphereBufferGeometry />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  </Canvas>,
  document.getElementById('root')
)
```

The canvas stretches to 100% of the next relative/absolute parent-container. Make sure your canvas is given space to show contents!

```jsx
<Canvas
  children                      // Either a function child (which receives state) or regular children
  gl                            // Props that go into the default webGL-renderer
  camera                        // Props that go into the default camera
  raycaster                     // Props that go into the default raycaster
  shadowMap                     // Props that go into gl.shadowMap, can also be set true for PCFsoft
  colorManagement = true        // Auto sRGBEncoding encoding for all colors and textures + ACESFilmic
  vr = false                    // Switches renderer to VR mode, then uses gl.setAnimationLoop
  webgl1 = false                // Forces THREE to WebGL1, instead of WebGL2 (default)
  concurrent = false            // Enables React concurrent mode
  resize = undefined            // Resize config, see react-use-measure's options
  orthographic = false          // Creates an orthographic camera if true
  noEvents = false              // Switch off raytracing and event support
  pixelRatio = undefined        // Default: 1. Use window.devicePixelRatio, or automatic: [min, max]
  invalidateFrameloop = false   // When true it only renders on changes, when false it's a game loop
  updateDefaultCamera = true    // Adjusts default camera on size changes
  onCreated                     // Callback when vdom is ready (you can block first render via promise)
  onPointerMissed />            // Response for pointer clicks that have missed a target
```

You can give it additional properties like style and className, which will be added to the container (a div) that holds the dom-canvas element.

### Defaults that the canvas component sets up

Canvas will create a _translucent WebGL-renderer_ with the following properties:

- antialias=true
- alpha=true
- powerPreference="high-performance"
- setClearAlpha(0)

A default _perspective camera_: `fov: 75, near: 0.1, far: 1000, z: 5, lookAt: [0,0,0]`

A default _orthographic camera_ if Canvas.orthographic is true: `near: 0.1, far: 1000, z: 5, lookAt: [0,0,0]`

A default _shadowMap_ if Canvas.shadowMap is true: `type: PCFSoftShadowMap`

A default _scene_ (into which all the JSX is rendered) and a _raycaster_.

A _wrapping container_ with a [resize observer](https://github.com/react-spring/react-use-measure): `scroll: true, debounce: { scroll: 50, resize: 0 }`. It does not polyfill it. Use [@juggle/resize-observer](https://github.com/juggle/resize-observer) if you must.

You do not have to use any of these objects, look under "Recipes" down below if you want to bring your own.

# Objects, properties and constructor arguments

You can use [Threejs's entire object catalogue and all properties](https://threejs.org/docs). When in doubt, always consult the docs.

❌ You could lay out an object like this:

```jsx
<mesh
  visible
  userData={{ hello: 'world' }}
  position={new THREE.Vector3(1, 2, 3)}
  rotation={new THREE.Euler(Math.PI / 2, 0, 0)}
  geometry={new THREE.SphereGeometry(1, 16, 16)}
  material={new THREE.MeshBasicMaterial({ color: new THREE.Color('hotpink'), transparent: true })}
/>
```

✅ The problem is that all of these properties will always be re-created. Instead, you should define properties declaratively.

```jsx
<mesh visible userData={{ hello: 'world' }} position={[1, 2, 3]} rotation={[Math.PI / 2, 0, 0]}>
  <sphereGeometry args={[1, 16, 16]} />
  <meshStandardMaterial color="hotpink" transparent />
</mesh>
```

#### Constructor arguments

In threejs objects are classes that are instanciated. These classes can receive one-time constructor arguments (`new THREE.SphereBufferGeometry(1, 32)`), and properties (`someObject.visible = true`). In three-fiber constructor arguments are always passed as an array via `args`. If args change later on, the object must naturally get re-constructed from scratch!

```jsx
<sphereBufferGeometry args={[1, 32]} />
```

#### Shortcuts (set)

All properties whose underlying object has a `.set()` method can directly receive the same arguments that `set` would otherwise take. For example [THREE.Color.set](https://threejs.org/docs/index.html#api/en/math/Color.set) can take a color string, so instead of `color={new THREE.Color('hotpink')}` you can simply write `color="hotpink"`. Some `set` methods take multiple arguments, for instance [THREE.Vector3](https://threejs.org/docs/index.html#api/en/math/Vector3.set), give it an array in that case `position={[100, 0, 0]}`.

#### Dealing with objects that are normally not part of the scene, and attaching

You can put non-Object3D primitives (geometries, materials, etc) into the render tree as well, so that they become managed and reactive. They are not part of the threejs scene! They take the same properties and constructor arguments they normally would.

Using the `attach` property objects bind to their parent and are taken off once they unmount. 

You can nest primitive objects, too:

```jsx
<mesh>
  <meshBasicMaterial attach="material">
    <texture attach="map" image={img} onUpdate={self => img && (self.needsUpdate = true)} />
```

Sometimes attaching isn't enough. For example, the following example attaches effects to an array called "passes" of the parent `effectComposer`. Note the use of `attachArray` which adds the object to the target array and takes it out on unmount:

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

**New in v5**, all elements ending with "Material" receive `attach="material"`, and all elements ending with "Geometry" receive `attach="geometry"` automatically. Of course you can still overwrite it, but it isn't necessary to type out any longer.

```jsx
<mesh>
  <meshBasicMaterial />
  <boxBufferGeometry />
```

#### Piercing into nested properties

If you want to reach into nested attributes (for instance: `mesh.rotation.x`), just use dash-case.

```jsx
<mesh rotation-x={1} material-uniforms-resolution-value={[1 / size.width, 1 / size.height]} />
```

#### Putting already existing objects into the scene-graph

You can use the `primitive` placeholder for that. You can still give it properties or attach nodes to it. Never add the same object multiple times, this is not allowed in Threejs!

```jsx
const mesh = useMemo(() => new THREE.Mesh(), [])
return <primitive object={mesh} position={[0, 0, 0]} />
```

#### Using 3rd-party objects declaratively

The `extend` function extends three-fiber's catalogue of JSX elements. Components added this way can then be referenced in the scene-graph using camel casing similar to other primitives.

```jsx
import { extend } from 'react-three-fiber'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
extend({ OrbitControls, TransformControls })

// ...
return (
  <>
    <orbitControls />
    <transformControls />
```

# Automatic disposal

Freeing resources is a [manual chore in Threejs](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects), but React is aware of object-lifecycles, hence three-fiber will attempt to free resources for you by calling `object.dispose()`, if present, on all unmounted objects.

If you manage assets by yourself, globally or in a cache, this may _not_ be what you want. You can switch it off by placing `dispose={null}` onto meshes, materials, etc, or even on parent containers like groups, it is now valid for the entire tree.

```jsx
const globalGeometry = new THREE.BoxBufferGeometry()
const globalMaterial = new THREE.MeshBasicMaterial()

function Mesh() {
  return (
    <group dispose={null}>
      <mesh geometry={globalGeometry} material={globalMaterial} />
```

# Events

Threejs objects that implement their own `raycast` method (meshes, lines, etc) can be interacted with by declaring events on them. We support pointer events, clicks and wheel-scroll. Events contain the browser event as well as the Threejs event data (object, point, distance, etc). You need to [polyfill](https://github.com/jquery/PEP) them yourself, if that's a concern.

Additionally, there's a special `onUpdate` that is called every time the object gets fresh props, which is good for things like `self => (self.verticesNeedUpdate = true)`.

Also notice the `onPointerMissed` on the canvas element, which fires on clicks that haven't hit *any* meshes.

```jsx
<mesh
  onClick={(e) => console.log('click')}
  onContextMenu={(e) => console.log('context menu')}
  onDoubleClick={(e) => console.log('double click')}
  onWheel={(e) => console.log('wheel spins')}
  onPointerUp={(e) => console.log('up')}
  onPointerDown={(e) => console.log('down')}
  onPointerOver={(e) => console.log('over')}
  onPointerOut={(e) => console.log('out')}
  onPointerEnter={(e) => console.log('enter')} // see note 1
  onPointerLeave={(e) => console.log('leave')} // see note 1
  onPointerMove={(e) => console.log('move')}
  onPointerMissed={() => console.log('missed')}
  onUpdate={(self) => console.log('props have been updated')}
/>
```

#### Event data

```jsx
({
  ...DomEvent                   // All the original event data
  ...Intersection                 // All of Three's intersection data - see note 2
  intersections: Intersection[]    // The first intersection of each intersected object
  object: Object3D              // The object that was actually hit
  eventObject: Object3D         // The object that registered the event
  unprojectedPoint: Vector3     // Camera-unprojected point
  ray: Ray                      // The ray that was used to strike the object
  camera: Camera                // The camera that was used in the raycaster
  sourceEvent: DomEvent         // A reference to the host event
  delta: number                 // Initial-click delta
}) => ...
```

<details>
<summary>How the event-system works, bubbling and capture</summary>
  
Note 1: the pointerenter and pointerleave events work exactly the same as pointerover and pointerout. The pointerenter and pointerleave semantics are not implemented.

Note 2: Some events (such as pointerout) happen when there is no intersection between `eventObject` and the ray. When this happens, the event will contain intersection data from a previous event with this object.

#### Event propagation (bubbling)

Propagation works a bit differently to the DOM because objects can occlude each other in 3D. The `intersections` array in the event includes all objects intersecting the ray, not just the nearest. Only the first intersection with each object is included.
The event is first delivered to the object nearest the camera, and then bubbles up through its ancestors like in the DOM. After that, it is delivered to the next nearest object, and then its ancestors, and so on. This means objects are transparent to pointer events by default, even if the object handles the event.

`event.stopPropagation()` doesn't just stop this event from bubbling up, it also stops it from being delivered to farther objects (objects behind this one). All other objects, nearer or farther, no longer count as being hit while the pointer is over this object. If they were previously delivered pointerover events, they will immediately be delivered pointerout events. If you want an object to block pointer events from objects behind it, it needs to have an event handler as follows:

```jsx
onPointerOver={e => {
  e.stopPropagation()
  // ...
}}
```

even if you don't want this object to respond to the pointer event. If you do want to handle the event as well as using `stopPropagation()`, remember that the pointerout events will happen **during** the `stopPropagation()` call. You probably want your other event handling to happen after this.

#### Pointer capture

Because events go to all intersected objects, capturing the pointer also works differently. In the DOM, the capturing object **replaces** the hit test, but in React-Three-Fiber, the capturing object is **added** to the hit test result: if the capturing object was not hit, then all of the hit objects (and their ancestors) get the event first, followed by the capturing object and its ancestors. The capturing object can also use `event.stopPropagation()` so that objects that really were hit get pointerout events.

Note that you can access the `setPointerCapture` and `releasePointerCapture` methods **only** via `event.target`: they don't get added to the `Object3D` instances in the scene graph.

`setPointerCapture` and `releasePointerCapture` take a `pointerId` parameter like in the DOM, but for now they don't have support for multiple active pointers. PRs are welcome!

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
</details>

# Hooks

Hooks can only be used **inside** the Canvas element because they rely on context!

❌ You cannot expect something like this to work:

```jsx
function App() {
  const { size } = useThree() // This will just crash
  return (
    <Canvas>
      <mesh>
```

✅ Do this instead:

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

This hook gives you access to all the basic objects that are kept internally, like the default renderer, scene, camera. It also gives you the current size of the canvas in screen and viewport coordinates. The hook is reactive, if you resize the browser, for instance, and you get fresh measurements, same applies to any of the defaults you can change.

```jsx
import { useThree } from 'react-three-fiber'

const {
  gl,                           // WebGL renderer
  scene,                        // Default scene
  camera,                       // Default camera
  raycaster,                    // Default raycaster
  size,                         // Bounds of the view (which stretches 100% and auto-adjusts)
  aspect,                       // Aspect ratio (size.width / size.height)
  mouse,                        // Current, centered, normalized 2D mouse coordinates
  raycaster,                    // Internal raycaster instance
  clock,                        // THREE.Clock (useful for useFrame deltas)
  invalidate,
  intersect,
  setDefaultCamera,
  viewport,
  forceResize,
} = useThree()

// Reactive viewport bounds, will updated on resize
const { width, height, factor, distance } = viewport
// Viewport can also calculate precise bounds on demand!
const { width, height, factor, distance } = viewport(camera?: THREE.Camera, target?: THREE.Vector3)
// Flags the canvas as "dirty" and forces a single frame
// Use this to inform your canvas of changes when it is set to "invalidateFrameloop"
invalidate()
// Exchanges the default camera
setDefaultCamera(camera)
// Trigger an intersect/raycast as well as event handlers that may respond
intersect(optionalEvent?: PointerEvent)
// Force size/viewport recalculation
forceResize()
```

#### useFrame

```jsx
useFrame((callback: (state, delta) => void), (renderPriority: number = 0))
```

Allows you to execute code on every frame rendered, like running effects, updating controls, and so on. You receive the state (same as `useThree`) and a clock delta. Your callback function will be invoked just before a frame is rendered.

```jsx
import { useFrame } from 'react-three-fiber'

const Controls = () => {
  const controls = useRef()
  
  /* Invoke the OrbitControls' update function on every frame */
  useFrame(() => controls.current.update())
  
  return <orbitControls ref={controls} />
}
```

If you need more control over the order in which `useFrame` callbacks are executed (and frames are rendered), you may pass a numerical `renderPriority` value; callbacks will be executed in order of ascending priority values (lowest first, highest last.) 

Using a non-zero render priority will cause react-three-fiber to disable its automatic rendering, and it will be your responsibility to render explicitly:

```jsx
useFrame(({ gl, scene, camera }) => gl.render(scene, camera), 1)
```

#### useResource

```jsx
useResource((optionalRef = undefined))
```

Take advantage of React's `useRef` with the added consideration of rendering when a component is available (e.g. in the next frame). Useful when you want to share and re-use declarative resources.

```jsx
import { useResource } from 'react-three-fiber'

const material = useResource()
return (
  <meshBasicMaterial ref={material} />
  <mesh material={material.current} />
  <mesh material={material.current} />
  <mesh material={material.current} />
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

#### useLoader

```jsx
useLoader(loader: THREE.Loader, url: string | string[], extensions?, xhr?)
```

This hook loads assets and suspends for easier fallback- and error-handling.

```jsx
import React, { Suspense } from 'react'
import { useLoader } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

function Asset({ url }) {
  const gltf = useLoader(GLTFLoader, url)
  return <primitive object={gltf.scene} />
}

<Suspense fallback={<Cube />}>
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

<details>
<summary>Special treatment of GLTFLoaders and all loaders that return a `scene` props.</summary>

If a data.scene prop is found the hook will automatically create a named object/material collection: nodes and materials. You might want use more for finegrained control of the loader-data. It lets you build immutable scene graphs selectively. You can also specifically alter the data without having to traverse it. The [gltfjsx](https://github.com/pmndrs/gltfjsx) specifically relies on this data.

```jsx
const { nodes, material } = useLoader(GLTFLoader, url)
```

</details>

#### useGraph

```jsx
const { nodes, materials } = useGraph(object: THREE.Object3D)
```

Convenience hook which creates a memoized, named object/material collection from any Object3D.

```jsx
function Asset({ url }) {
  const scene = useLoader(OBJLoader, url)
  const { nodes, materials } = useGraph(scene)
  return <mesh geometry={nodes.robot.geometry} material={materials.metal} />
```

# Additional exports

```jsx
import {
  addEffect,                    // Adds a global render callback which is called each frame
  addAfterEffect,               // Adds a global after-render callback which is called each frame
  addTail,                      // Adds a global callback which is called when rendering stops
  invalidate,                   // Forces view global invalidation
  extend,                       // Extends the native-object catalogue
  createPortal,                 // Creates a portal (it's a React feature for re-parenting)
  render,                       // Internal: Renders three jsx into a scene
  unmountComponentAtNode,       // Internal: Unmounts root scene
  applyProps,                   // Internal: Sets element properties
  forceResize,                  // Internal: Force size/viewport recalculation of all canvases
} from 'react-three-fiber'
```

# Gotchas

#### Consuming context from a foreign provider

At the moment React context [can not be readily used between two renderers](https://github.com/react-spring/react-three-fiber/issues/43), this is due to a problem within React. If react-dom opens up a provider, you will not be able to consume it within `<Canvas>`. If managing state (like Redux) is your problem, then [zustand](https://github.com/react-spring/zustand) is likely the best solution, otherwise you can solve it by forwarding the context object that you are trying to access:

```jsx
function App() {
  const value = useContext(context)
  return (
    <Canvas>
      <context.Provider value={value}>
        {/* children can now read state from context */}
```
