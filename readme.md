<p align="center">
  <a href="https://github.com/drcmda/learnwithjason"><img width="288" height="172" src="https://i.imgur.com/1atWRR3.gif" /></a>
  <a href="https://codesandbox.io/embed/react-three-fiber-suspense-gltf-loader-l900i"><img width="288" height="172" src="https://i.imgur.com/8xpKFkN.gif" /></a>
  <a href="https://codesandbox.io/embed/387z7o2zrq"><img width="288" height="172" src="https://i.imgur.com/YewcWL5.gif" /></a>
  <a href="https://codesandbox.io/embed/m7q0r29nn9"><img width="288" height="172" src="https://i.imgur.com/LDddjjC.gif" /></a>
  <a href="https://codesandbox.io/embed/jz9l97qn89"><img width="288" height="172" src="https://i.imgur.com/zrhe5Jc.gif" /></a>
  <a href="https://codesandbox.io/embed/kky7yk087v"><img width="288" height="172" src="https://i.imgur.com/jemlXzE.gif" /></a>
  <a href="https://codesandbox.io/embed/ly0oxkp899"><img width="288" height="172" src="https://i.imgur.com/vjmDwpS.gif" /></a>
  <a href="https://codesandbox.io/embed/9y8vkjykyy"><img width="288" height="172" src="https://i.imgur.com/tQi753C.gif" /></a>
  <a href="https://codesandbox.io/embed/y3j31r13zz"><img width="288" height="172" src="https://i.imgur.com/iFtjKHM.gif" /></a>
</p>
<p align="middle">
  <i>These demos are real, you can click them! They contain the full code, too.</i>
</p>

    npm install three react-three-fiber

React-three-fiber is a small React renderer for Threejs. Why, you might ask? React was made to drive complex tree structures, it makes just as much sense for Threejs as for the DOM. Building a dynamic scene graph becomes so much easier because you can break it up into declarative, re-usable components with clean, reactive semantics. This also opens up the ecosystem, you can now apply generic packages for state, animation, gestures and so on.

# What it looks like ...

Copy the following into a project to get going. [Here's the same](https://codesandbox.io/s/rrppl0y8l4) running in a code sandbox.

```jsx
import * as THREE from 'three'
import React from 'react'
import ReactDOM from 'react-dom'
import { Canvas } from 'react-three-fiber'

function Thing({ vertices }) {
  return (
    <group ref={ref => console.log('we have access to the instance')}>
      <line>
        <geometry
          attach="geometry"
          vertices={vertices.map(v => new THREE.Vector3(...v))}
          onUpdate={self => (self.verticesNeedUpdate = true)}
        />
        <lineBasicMaterial attach="material" color="black" />
      </line>
      <mesh 
        onClick={e => console.log('click')} 
        onPointerOver={e => console.log('hover')} 
        onPointerOut={e => console.log('unhover')}>
        <octahedronGeometry attach="geometry" />
        <meshBasicMaterial attach="material" color="peachpuff" opacity={0.5} transparent />
      </mesh>
    </group>
  )
}

ReactDOM.render(
  <Canvas>
    <Thing vertices={[[-1, 0, 0], [0, 1, 0], [1, 0, 0], [0, -1, 0], [-1, 0, 0]]} />
  </Canvas>,
  document.getElementById('root')
)
```

# Canvas

The `Canvas` object is your portal into Threejs. It renders Threejs elements, *not DOM elements*!

```jsx
<Canvas
  children                      // Either a function child (which receives state) or regular children
  gl                            // Props that go into the default webGL-renderer
  camera                        // Props that go into the default camera
  raycaster                     // Props that go into the default raycaster
  shadowMap                     // Props that go into gl.shadowMap, can also be set true for PCFsoft
  vr = false                    // Switches renderer to VR mode, then uses gl.setAnimationLoop
  orthographic = false          // Creates an orthographic camera if true
  pixelRatio = undefined        // You could provide window.devicePixelRatio if you like 
  invalidateFrameloop = false   // When true it only renders on changes, when false it's a game loop
  updateDefaultCamera = true    // Adjusts default camera on size changes
  onCreated                     // Callback when vdom is ready (you can block first render via promise)
  onPointerMissed />            // Response for pointer clicks that have missed a target
```

You can give it additional properties like style and className, which will be added to the container (a div) that holds the dom-canvas element.

# Defaults

Canvas will create a *translucent webGL-renderer* with the following properties: 

`antialias: true, alpha: true, setClearAlpha(0)`

A default *perspective camera*:

`fov: 75, near: 0.1, far: 1000, position.z: 5`

Or a default *orthographic camera* if Canvas.orthographic is true:

`near: 0.1, far: 1000, position.z: 5`

A default scene (into which all the jsx is rendered) and a raycaster. You do not have to use any of these objects, look under "receipes" down below if you want to bring your own.

# Objects and properties

You can use [Three's entire object catalogue and all properties](https://threejs.org/docs). When in doubt, always consult the docs.

```jsx
<mesh
  visible
  userData={{ test: "hello" }}
  position={new THREE.Vector3(1, 2, 3)}
  rotation={new THREE.Euler(0, 0, 0)}
  geometry={new THREE.SphereGeometry(1, 16, 16)}
  material={new THREE.MeshBasicMaterial({ color: new THREE.Color('indianred'), transparent: true })} />
```

#### Shortcuts and non-Object3D stow-away

The following is the same as above, but it's leaner and critical properties aren't re-instantiated on every render.

```jsx
<mesh visible userData={{ test: "hello" }} position={[1, 2, 3]} rotation={[0, 0, 0]}>
  <sphereGeometry attach="geometry" args={[1, 16, 16]} />
  <meshStandardMaterial attach="material" color="indianred" transparent />
</mesh>
```

All properties that have a `.set()` method (colors, vectors, euler, matrix, etc) can be given a shortcut. For example [THREE.Color.set](https://threejs.org/docs/index.html#api/en/math/Color.set) can take a color string, hence instead of `color={new THREE.Color('peachpuff')}` you can do `color="peachpuff"`. Some `set` methods take multiple arguments (vectors for instance), in this case you can pass an array.

You can stow away non-Object3D primitives (geometries, materials, etc) into the render tree so that they become managed and reactive. They take the same properties they normally would, constructor arguments are passed with `args`. Using the `attach` property objects bind automatically to their parent and are taken off it once they unmount.

You can nest primitive objects, too, which is good for awaiting async textures and such. You could use React-suspense if you wanted!

```jsx
<meshBasicMaterial attach="material">
  <texture attach="map" format={THREE.RGBFormat} image={img} onUpdate={self => img && (self.needsUpdate = true)} />
</meshBasicMaterial>
```

Sometimes attaching isn't enough. For example, this code attaches effects to an array called "passes" of the parent `effectComposer`. Note the use of `attachArray` which adds the object to the target array and takes it out on unmount:

```jsx
<effectComposer>
  <renderPass attachArray="passes" />
  <glitchPass attachArray="passes" renderToScreen />
</effectComposer>
```

You can also attach to named parent properties using `attachObject={[target, name]}`, which adds the object and takes it out on unmount. The following adds a buffer-attribute to parent.attributes.position. 

```jsx
<bufferGeometry>
  <bufferAttribute
    attachObject={['attributes', 'position']}
    count={vertices.length / 3}
    array={vertices}
    itemSize={3} />
</bufferGeometry>
```

#### Piercing into nested properties

If you want to reach into nested attributes (for instance: `mesh.rotation.x`), just use dash-case:

```jsx
<mesh rotation-x={1} material-color="lightblue" geometry-vertices={newVertices} />
```

#### Putting already existing objects into the scene-graph

You can use the `primitive` placeholder for that. You can still give it properties or attach nodes to it.

```jsx
const mesh = new THREE.Mesh()
return <primitive object={mesh} position={[0, 0, 0]} />
```

#### Using 3rd-party (non THREE namespaced) objects in the scene-graph

The `apply` function extends three-fibers catalogue of known native elements. These objects become available and can now be directly instantiated.

```jsx
import { apply } from 'react-three-fiber'
import { EffectComposer } from './postprocessing/EffectComposer'
import { RenderPass } from './postprocessing/RenderPass'

apply({ EffectComposer, RenderPass })

<effectComposer>
  <renderPass />
</effectComposer>
```

# Events

THREE objects that implement their own `raycast` method (for instance meshes, lines, etc) can be interacted with by declaring events on the object. We support pointer events ([you need to polyfill them yourself](https://github.com/jquery/PEP)), clicks and wheel-scroll.

Additionally there's a special `onUpdate` that is called every time the object is updated with fresh props (as well as when it's first being created).

The event data you receive contains the browser event as well as the Threejs event data (object, point, distance, etc) all merged into one object.

```jsx
<mesh
  onClick={e => console.log('click')}
  onWheel={e => console.log('wheel spins')}
  onPointerUp={e => console.log('up')}
  onPointerDown={e => console.log('down')}
  onPointerOver={e => console.log('hover')}
  onPointerOut={e => console.log('unhover')}
  onPointerMove={e => console.log('move')}
  onUpdate={self => console.log('props have been updated')}
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

All hooks can only be used **inside** the Canvas element because they rely on context updates! You cannot expect something like this to work:

```jsx
function App() {
  const { gl } = useThree() // This will just crash
  return (
    <Canvas>
      <mesh>
        ...
```

Do this instead:

```jsx
function SomeComponent() {
  const { gl } = useThree()
  return <mesh />
}
        
function App() {
  return (
    <Canvas>
      <SomeComponent />
        ...
```

#### useThree()

This hooks gives you access to all the basic objects that are kept internally, like the default renderer, scene, camera. It also gives you the size of the canvas in screen and viewport coordinates. When you resize the canvas, or the browser window, your component will be updated with fresh values. 

```jsx
import { useThree } from 'react-three-fiber'

const { 
  gl,               // WebGL renderer
  canvas,           // canvas the dom element that was created
  scene,            // Default scene
  camera,           // Default camera
  size,             // Bounds of the view (which stretches 100% and auto-adjusts)
  viewport,         // Bounds of the viewport in 3d units + factor (size/viewport)
  aspect,           // Aspect ratio (size.width / size.height)
  invalidate,       // Invalidates a single frame (for <Canvas invalidateFrameloop />)
  intersect,        // Calls onMouseMove handlers for objects underneath the cursor
  setDefaultCamera  // Sets the default camera
} = useThree()
```

#### useRender(callback, takeOver=false, dependencies=[])

If you're running effects, postprocessings, controls, etc that need to get updated every frame, useRender gives you access to the render-loop. You receive the internal state as well, which is the same as what you would get from useThree.

```jsx
import { useRender } from 'react-three-fiber'

// Subscribes to the render-loop, gets cleaned up automatically when the component unmounts
useRender(state => console.log("I'm in the render-loop"))

// Add a "true" as the 2nd argument and you take over the render-loop completely
useRender(({ gl, scene, camera }) => gl.render(scene, camera), true)
```

#### useUpdate(callback, dependencies, optionalRef=undefined)

Sometimes objects have to be updated imperatively. You could update the parts that you can access declaratively and then call `onUpdate={self => ...}`, or there's useUpdate.

```jsx
import { useUpdate } from 'react-three-fiber'

const ref = useUpdate( 
  geometry => {
    geometry.addAttribute('position', getCubeVertices(x, y, z))
    geometry.attributes.position.needsUpdate = true
    geometry.computeBoundingSphere()
  }, 
  [x, y, z], // execute only if these properties change
)
return <bufferGeometry ref={ref} />
```

#### useResource(optionalRef=undefined)

Materials and such aren't normally re-created for every instance using it. You may want to share and re-use resources. This can be done imperatively simply by maintaining the object yourself, but it can also be done declaratively by using refs. `useResource` simply creates a ref and re-renders the component when it becomes available next frame. You can pass this reference on, or even channel it through a context provider.

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

#### useLoader(loader, url, [extensions]) (experimental!)

Loading objects in THREE is, again, imperative. If you want to write out a loaded object declaratively, where you get to lay events on objects, alter materials, etc, then useLoader will help you. It loads a file (which must be present somewhere in your static/public folder) and caches it. It returns an array of geometry/material pairs.

```jsx
import { useLoader } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

const model = useLoader(GLTFLoader, '/spaceship.gltf', loader => {
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco-gltf/')
  loader.setDRACOLoader(dracoLoader)
}))
return model.map(({ geometry, material }) => (
  <mesh key={geometry.uuid} geometry={geometry} castShadow>
    <meshStandardMaterial attach="material" map={material.map} roughness={1} />
  </mesh>
)
```

# Additional exports

```jsx
import {
  addEffect,              // Adds a global callback which is called each frame
  invalidate,             // Forces view global invalidation
  apply,                  // Extends the native-object catalogue
  createPortal,           // Creates a portal (it's a React feature for re-parenting)
  render,                 // Internal: Renders three jsx into a scene
  unmountComponentAtNode, // Internal: Unmounts root scene
  applyProps,             // Internal: Sets element properties
} from 'react-three-fiber'
```

# Recipes

## Handling loaders

You can use React's built-in memoizing-features (as well as suspense) to build async dependency graphs.

```jsx
function Image({ url }) {
  const texture = useMemo(() => new THREE.TextureLoader().load(url), [url])
  return (
    <mesh>
      <planeBufferGeometry attach="geometry" args={[1, 1]} />
      <meshLambertMaterial attach="material" transparent>
        <primitive attach="map" object={texture} />
      </meshLambertMaterial>
    </mesh>
  )
}
```

Please also take a look at useLoader, it was made to make 3d-asset loading easier. 

## Dealing with effects (hijacking main render-loop)

Managing effects can get quite complex normally. Drop the component below into a scene and you have a live effect. Remove it and everything is as it was without any re-configuration.

```jsx
import { apply, Canvas, useRender, useThree } from 'react-three-fiber'
import { EffectComposer } from './postprocessing/EffectComposer'
import { RenderPass } from './postprocessing/RenderPass'
import { GlitchPass } from './postprocessing/GlitchPass'
// Makes these objects available as native objects "<renderPass />" and so on
apply({ EffectComposer, RenderPass, GlitchPass })

function Effects({ factor }) {
  const { gl, scene, camera, size } = useThree()
  const composer = useRef()
  useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  // This takes over as the main render-loop (when 2nd arg is set to true)
  useRender(() => composer.current.render(), true)
  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" args={[scene, camera]} />
      <glitchPass attachArray="passes" factor={factor} renderToScreen />
    </effectComposer>
  )
}
```

## Using your own camera rig

```jsx
function Camera(props) {
  const camera = useRef()
  const { setDefaultCamera } = useThree()
  // This makes sure that size-related calculations are proper
  // Every call to useThree will return this camera instead of the default camera 
  useEffect(() => void setDefaultCamera(camera.current), [])
  return <perspectiveCamera ref={camera} {...props} />
}

<Canvas>
  <Camera position={[0, 0, 10]} />
</Canvas>
```

## Heads-up display (rendering multiple scenes)

`useRender` allows components to hook into the render-loop, or even to take it over entirely. That makes it possible for one component to render over the content of another. The order of these operations is established by the scene-graph.

```jsx
function Content({ camera }) {
  const scene = useRef()
  useRender(({ gl }) => void ((gl.autoClear = true), gl.render(scene.current, camera)), true)
  return <scene ref={scene}>{/* ... */}</scene>
}

function HeadsUpDisplay({ camera }) {
  const scene = useRef()
  useRender(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene.current, camera)))
  return <scene ref={scene}>{/* ... */}</scene>
}

function Main() {
  const camera = useRef()
  const { width, height } = useThree().size
  return (
    <>
      <perspectiveCamera
        ref={camera}
        aspect={width / height}
        radius={(width + height) / 4}
        onUpdate={self => self.updateProjectionMatrix()}
      />
      {camera.current && (
        <group>
          <Content camera={camera.current} />
          <HeadsUpDisplay camera={camera.current} />
        </group>
      )}
    </>
  )
}
```

## Managing imperative code

Stick imperative stuff into useMemo and write out everything else declaratively. This is how you can quickly form reactive, re-usable components that can be bound to a store, graphql, etc.

```jsx
function Extrusion({ start = [0,0], paths, ...props }) {
  const shape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(...start)
    paths.forEach(path => shape.bezierCurveTo(...path))
    return shape
  }, [start, paths])

  return (
    <mesh>
      <extrudeGeometry attach="geometry" args={[shape, props]} />
      <meshPhongMaterial attach="material" />
    </mesh>
  )
}
```

Then ...

```jsx
<Extrusion
  start={[25, 25]}
  paths={[[25, 25, 20, 0, 0, 0], [30, 0, 30, 35,30,35], [30, 55, 10, 77, 25, 95]]}
  bevelEnabled
  amount={8}
  bevelSegments={2}
  steps={2}
  bevelSize={1}
  bevelThickness={1} />
```

## ShaderMaterials

```jsx
function CrossFade({ url1, url2, disp }) {
  const [texture1, texture2, dispTexture] = useMemo(() => {
    const loader = new THREE.TextureLoader()
    return [loader.load(url1), loader.load(url2), loader.load(disp)]
  }, [url1, url2, disp])
  return (
    <mesh>
      <planeBufferGeometry attach="geometry" args={[3.8, 3.8]} />
      <shaderMaterial
        attach="material"
        args={[CrossFadeShader]}
        uniforms-texture-value={texture1}
        uniforms-texture2-value={texture2}
        uniforms-disp-value={dispTexture}
        uniforms-dispFactor-value={0.5}
      />
    </mesh>
  )
}
```

## Re-parenting

We support [portals](https://reactjs.org/docs/portals.html). You can use them to teleport a piece of the view into another container. Click [here](https://codesandbox.io/s/three-fibre-userender-test-fojbq) for a small demo.

```jsx
import { createPortal } from 'react-three-fiber'

function Component() {
  // "target" can be a three object, like a group, etc
  return createPortal(<mesh />, target)
```

## Rendering only when needed

By default it renders like a game loop, which isn't that battery efficient. Switch on `invalidateFrameloop` to activate loop invalidation, which is automatic most of the time.

```jsx
<Canvas invalidateFrameloop ... />
```

Sometimes you must be able to kick off frames manually, for instance when you're dealing with async stuff or camera controls:

```jsx
const { invalidate } = useThree()
const texture = useMemo(() => loader.load(url1, invalidate), [url1])
```

## Enabling VR

Supplying the `vr` flag enables Three's VR mode and switches the render-loop to gl.setAnimationLoop [as described in Three's docs](https://threejs.org/docs/index.html#manual/en/introduction/How-to-create-VR-content).

```jsx
import * as VR from '!exports-loader?WEBVR!three/examples/js/vr/WebVR'
import { Canvas } from 'react-three-fiber'

<Canvas vr onCreated={({ gl }) => document.body.appendChild(VR.createButton(gl))} />
```

## Switching the default renderer

If you want to exchange the default renderer you can. But, you will lose some of the functionality, like useRender, useThree, events, which is all covered in canvas. [Here's](https://codesandbox.io/s/yq90n32zmx) a small example. 

```jsx
import { render, unmountComponentAtNode } from 'react-three-fiber'

const renderer = new THREE.SVGRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const scene = new THREE.Scene()

render((
  <mesh>
    <sphereGeometry name="geometry" args={[1, 16, 16]} />
    <meshBasicMaterial name="material" />
  </mesh>
), scene)
```

## Reducing bundle-size

Three is a heavy-weight, and althought it is modular tree-shaking may not be sufficient. But you can always create your own exports file and alias the "three" name towards it. This way you can reduce it to 50-80kb or perhaps less.

Gist: https://gist.github.com/drcmda/974f84240a329fa8a9ce04bbdaffc04d


## Usage with React Native (beta)

You can leverage Expo's excellent WebGL port to react-native and use react-three-fiber as the renderer.

```bash
expo init myapp
cd myapp
yarn add expo-gl expo-three three@0.105.0 react-three-fiber@beta
yarn start
```

#### Limitations

three@0.105.0 is the only recent version that includes required files for expo-three

The `onClick` and `onWheel` will not be triggered, react-three-fiber uses PanResponder in the background to detect touches and presses.

Be aware that performance is limited compared to ThreeJS in the browser.
