# API

You need to be versed in both React and Threejs before rushing into this. If you are unsure about React consult the official [React docs](https://reactjs.org/docs/getting-started.html), especially [the section about hooks](https://reactjs.org/docs/hooks-reference.html). As for Threejs, make sure you at least glance over the [fundamentals](https://github.com/pmndrs/react-three-fiber#fundamentals) section on the main-page, know at least the very basics.

## Table of Contents

- [Canvas](#canvas)
- [Render function](#render-function)
- [Objects, properties and constructor arguments](#objects-properties-and-constructor-arguments)
- [Automatic disposal](#automatic-disposal)
- [Events](#events)
- [Hooks](#hooks)
  - [useThree](#useThree)
  - [useFrame](#useFrame)
  - [useLoader](#useloader)
  - [useGraph](#useGraph)
- [Additional exports](#additional-exports)
- [Gotchas](#gotchas)

# Canvas

The `Canvas` object is your portal into Threejs. It renders Threejs elements, _not DOM elements_! Here is a small hello-world that you can try out:

```jsx
import React from 'react'
import ReactDOM from 'react-dom'
import { Canvas } from '@react-three/fiber'

ReactDOM.render(
  <Canvas>
    <pointLight position={[10, 10, 10]} />
    <mesh>
      <sphereBufferGeometry />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  </Canvas>,
  document.getElementById('root'),
)
```

The canvas stretches to 100% of the next relative/absolute parent-container. Make sure your canvas is given space to show contents!

```jsx
<Canvas
  children                      // Threejs jsx elements or regular components
  gl                            // Props that go into the default renderer | or your own renderer
  camera                        // Props that go into the default camera | or your own THREE.Camera
  raycaster                     // Props that go into the default raycaster
  shadows                       // Props that go into gl.shadowMap, can also be set true for PCFsoft
  linear = false                // True by default for automatic sRGB encoding and gamma correction
  vr = false                    // Switches renderer to VR mode, then uses gl.setAnimationLoop
  mode = "blocking"             // React mode: legacy | blocking | concurrent
  resize = undefined            // Resize config, see react-use-measure's options
  orthographic = false          // Creates an orthographic camera if true
  dpr = undefined               // Pixel-ratio, use window.devicePixelRatio, or automatic: [min, max]
  frameloop = "always"          // Render-mode: always | demand | never
  onCreated                     // Callback when vdom is ready
  onPointerMissed />            // Response for pointer clicks that have missed a target
```

You can give it additional properties like style and className, which will be added to the container (a div) that holds the dom-canvas element.

### Defaults that the canvas component sets up

Canvas will create a _translucent WebGL-renderer_ with the following properties:

- pixelratio=1
- antialias=true
- alpha=true
- powerPreference="high-performance"
- setClearAlpha(0)

A default _perspective camera_: `fov: 75, near: 0.1, far: 1000, z: 5, lookAt: [0,0,0]`

A default _orthographic camera_ if Canvas.orthographic is true: `near: 0.1, far: 1000, z: 5, lookAt: [0,0,0]`

A default _shadowMap_ if Canvas.shadowMap is true: `type: PCFSoftShadowMap`

A default _scene_ (into which all the JSX is rendered) and a _raycaster_

A _wrapping container_ with a [resize observer](https://github.com/react-spring/react-use-measure): `scroll: true, debounce: { scroll: 50, resize: 0 }` (consider polyfills for [Safari support](recipes.md#safari-support))

The colorspace will be set to sRGB (if `linear` is not false), all colors and textures will be [auto-converted](https://www.donmccurdy.com/2020/06/17/color-management-in-threejs).

# Render function

As of version 6 you may use a render function, similar to how react-dom and all the other React renderers work. This allows you to shave off react-dom (~40kb), react-use-measure + resize-observer-polyfill (~5kb) and, if you don't need them, pointer-events (~7kb) (you need to explictely import `events` and add them to the config otherwise).

The render functions config has the same options and properties as `Canvas`, but you are responsible for resizing it. It requires an existing dom `<canvas>` object into which it renders.

```jsx
import React from 'react'
import { render, events } from '@react-three/fiber'

window.addEventListener('resize', () =>
  render(<mesh />, document.querySelector('canvas'), {
    events,
    size: { width: window.innerWidth, height: window.innerHeight },
  }),
)

window.dispatchEvent(new Event('resize'))
```

To unmount and dispose of all the memory that has been acquired:

```jsx
import { unmountComponentAtNode } from '@react-three/fiber'

unmountComponentAtNode(document.querySelector('canvas'))
```

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

In threejs objects are classes that are instantiated. These classes can receive one-time constructor arguments (`new THREE.SphereGeometry(1, 32)`), and properties (`someObject.visible = true`). In three-fiber constructor arguments are always passed as an array via `args`. If args change later on, the object must naturally get re-constructed from scratch!

```jsx
<sphereGeometry args={[1, 32]} />
```

#### Shortcuts

All properties whose underlying object has a `.set()` method can directly receive the same arguments that `set` would otherwise take. For example [THREE.Color.set](https://threejs.org/docs/index.html#api/en/math/Color.set) can take a color string, so instead of `color={new THREE.Color('hotpink')}` you can simply write `color="hotpink"`. Some `set` methods take multiple arguments, for instance [THREE.Vector3](https://threejs.org/docs/index.html#api/en/math/Vector3.set), give it an array in that case `position={[100, 0, 0]}`.

```jsx
<mesh position={[1, 2, 3]} />
  <meshStandardMaterial color="hotpink" />
```

Properties that have a `setScalar` method (for instance Vector3) can be set like so:

```jsx
// Translates to <mesh scale={[1, 1, 1]} />
<mesh scale={1} />
```

#### Dealing with objects that are normally not part of the scene, and attaching

You can put non-Object3D primitives (geometries, materials, etc) into the render tree as well, so that they become managed and reactive. They take the same properties and constructor arguments they normally would.

Using the `attach` property objects bind to their parent and are taken off once they unmount.

The following attaches a material to the `material` property of a mesh:

```jsx
<mesh>
  <meshBasicMaterial attach="material">
```

You can nest primitive objects, too:

```jsx
<mesh>
  <meshBasicMaterial attach="material">
    <texture attach="map" image={img} onUpdate={self => (self.needsUpdate = true)} />
```

Sometimes attaching isn't enough. For example, the following example attaches effects to an array called "passes" of the parent `effectComposer`. `attachArray` adds the object to the target array and takes it out on unmount:

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

As of version 5 all elements ending with "Material" receive `attach="material"`, and all elements ending with "Geometry" receive `attach="geometry"` automatically. Of course you can still overwrite it, but it isn't necessary to type out any longer.

```jsx
<mesh>
  <meshBasicMaterial />
  <boxGeometry />
```

#### Piercing into nested properties

If you want to reach into nested attributes (for instance: `mesh.rotation.x`), just use dash-case.

```jsx
<mesh rotation-x={1} material-uniforms-resolution-value={[1 / size.width, 1 / size.height]} />
```

#### Putting already existing objects into the scene-graph

You can use the `primitive` placeholder for that. You can still give it properties or attach nodes to it. Never add the same object multiple times, this is not allowed in Threejs! Primitives will not dispose of the object they carry on unmount, you are responsible for disposing of it!

```jsx
const mesh = new THREE.Mesh(geometry, material)

function Component() {
  return <primitive object={mesh} position={[10, 0, 0]} />
```

#### Using 3rd-party objects declaratively

The `extend` function extends three-fiber's catalogue of JSX elements. Components added this way can then be referenced in the scene-graph using camel casing similar to other primitives.

```jsx
import { extend } from '@react-three/fiber'
import { OrbitControls, TransformControls } from 'three-stdlib'
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
const globalGeometry = new THREE.BoxGeometry()
const globalMaterial = new THREE.MeshBasicMaterial()

function Mesh() {
  return (
    <group dispose={null}>
      <mesh geometry={globalGeometry} material={globalMaterial} />
```

# Events

Threejs objects that implement their own `raycast` method (meshes, lines, etc) can be interacted with by declaring events on them. We support pointer events, clicks and wheel-scroll. Events contain the browser event as well as the Threejs event data (object, point, distance, etc). You may want to [polyfill](https://github.com/jquery/PEP) them, if that's a concern.

Additionally, there's a special `onUpdate` that is called every time the object gets fresh props, which is good for things like `self => (self.verticesNeedUpdate = true)`.

Also notice the `onPointerMissed` on the canvas element, which fires on clicks that haven't hit _any_ meshes.

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
useThree(selector) => state
```

This hook gives you access to all the basic objects that are kept internally, like the default renderer, scene, camera. It also gives you the current size of the canvas in screen and viewport coordinates. The hook is reactive, if you resize the browser for instance, you get fresh measurements, same applies to any of the defaults that may change.

```jsx
import { useThree } from '@react-three/fiber'

const {
  gl, // THREE.WebGLRenderer
  scene, // THREE.Scene
  camera, // Camera
  raycaster, // Raycaster
  mouse, // THREE.Vector2
  clock, // THREE.Clock
  vr, // boolean
  linear, // Colorspace, boolean
  frameloop, // 'always' | 'demand' | 'never'
  performance: {
    current, // Current performance status, must be between min and max, number
    min, // Performance lower bounds, number
    max, // Performance upper bounds, number
    debounce, // Debounce timeout, number
    regress, // Flag regression, () => void
  },
  size: {
    width, // Canvas width in pixels, number;
    height, // Canvas height in pixels, number;
  },
  viewport: {
    width, // Viewport width in units, number;
    height, // Viewport height in units, number;
    initialDpr, // Initial pixel-ratio, number
    dpr, // Current pixel-ratio, number
    factor, // Size.width / Viewport.width, number
    distance, // Distance from camera, number
    aspect, // Size.width / Size.height, number
    getCurrentViewport, // (camera?: Camera, target?: THREE.Vector3, size?: Size) => Viewport
  },
  set, // Allows you to set any state property, SetState<RootState>
  get, // Allows you to retrieve any state property non-rteactively, GetState<RootState>
  invalidate, // Request a new render, given that frameloop === 'demand', () => void
  advance, // Advance one tick, given that frameloop === 'never', (timestamp: number, runGlobalEffects?: boolean) => void
  setSize, // Resize the canvs, (width: number, height: number) => void
  setDpr, // Reset the pixel-ratio, (dpr: Dpr) => void
  onPointerMissed, // () => void
  events: {
    connected, // Event-target (for instance a dom node), TTarget | boolean
    handlers, // Pointer-event handlers (pointermove, up, down, etc), Events
    connect, // Re-connect to a new target, (target: TTarget) => void
    disconnect, // Dis-connect handlers, () => void
  },
} = useThree()
```

You can also select properties, this allows you to avoid needless re-render for components that are interested only in particulars.

```jsx
// Will only trigger re-render when the default camera is exchanged
const camera = useThree((state) => state.camera)
// Will only re-render on resize changes
const viewport = useThree((state) => state.viewport)
```

#### useFrame

```jsx
useFrame((callback: (state, delta) => void), (renderPriority: number = 0))
```

Allows you to execute code on every frame rendered, like running effects, updating controls, and so on. You receive the state (same as `useThree`) and a clock delta. Your callback function will be invoked just before a frame is rendered.

```jsx
import { useFrame } from '@react-three/fiber'

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

#### useLoader

```jsx
useLoader(loader: THREE.Loader, url: string | string[], extensions?, xhr?)
```

This hook loads assets and suspends for easier fallback- and error-handling.

```jsx
import React, { Suspense } from 'react'
import { useLoader } from '@react-three/fiber'
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
const { nodes, materials } = useGraph((object: THREE.Object3D))
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
  addEffect, // Adds a global render callback which is called each frame
  addAfterEffect, // Adds a global after-render callback which is called each frame
  addTail, // Adds a global callback which is called when rendering stops
  invalidate, // Forces view global invalidation
  advance, // Advances the frameloop (given that it's set to 'never')
  extend, // Extends the native-object catalogue
  createPortal, // Creates a portal (it's a React feature for re-parenting)
  render, // Renders three jsx into a canvas
  unmountComponentAtNode, // Unmounts root scene
  events, // Dom pointer-event system
  applyProps, // applyProps(element, props) sets element properties,
  act, // react-testing
} from '@react-three/fiber'
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

There's also a ready-made solution in drei: [useContextBridge](https://github.com/pmndrs/drei#usecontextbridge) which allows you to forward contexts provided above the <Canvas /> to be consumed within it.

```jsx
function SceneWrapper() {
  // bridge any number of contexts
  const ContextBridge = useContextBridge(ThemeContext, GreetingContext)
  return (
    <Canvas>
      <ContextBridge>
        <Scene />
      </ContextBridge>
    </Canvas>
  )
}

function Scene() {
  // we can now consume a context within the Canvas
  const theme = React.useContext(ThemeContext)
  const greeting = React.useContext(GreetingContext)
  return (
    //...
  )
}
```
