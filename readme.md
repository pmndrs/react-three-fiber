<p align="center">
  <a href="https://codesandbox.io/embed/ly0oxkp899"><img width="864" src="https://i.imgur.com/vjmDwpS.gif" /></a>
  <a href="https://codesandbox.io/embed/9y8vkjykyy"><img width="430" src="https://i.imgur.com/tQi753C.gif" /></a>
  <a href="https://codesandbox.io/embed/y3j31r13zz"><img width="430" src="https://i.imgur.com/iFtjKHM.gif" /></a>
</p>
<p align="middle">
  <i>These demos are real, you can click them! They contain the full code, too.</i>
</p>

    npm install react-three-fiber

React-three-fiber is a small React renderer for Three-js. Why, you might ask? React was made to drive complex tree structures, it makes just as much sense for Three as it makes for the Dom. Building a dynamic scene graph becomes so much easier because you can break it up into declarative, re-usable components with clean, reactive semantics. This also opens up the eco system, you can now apply generic packages for state, animation, gestures and so on.

#### Difference to react-three, react-three-renderer, react-three-renderer-fiber

This is a small reconciler config with a few additions for interaction and hooks holding it all together. It does not know or care about Three internals, it uses heuristics for objects and attributes, so that we can get away without creating a strong dependency. Three is constantly changing, we don't want to rely on a specific version or chase their release cycle. This library works with version 1 as well as their latest. At the same time we don't want to alter any rules, if something works in Three in a specific way, it will be the same here.

# How it looks like ...

Copy the following into a project to get going. [Here's the same](https://codesandbox.io/s/rrppl0y8l4) running in a code sandbox.

```jsx
import * as THREE from 'three'
import React from 'react'
import ReactDOM from 'react-dom'
import { Canvas } from 'react-three-fiber'

function Thing({ vertices, color }) {
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
        onMouseEnter={e => console.log('hover')} 
        onMouseLeave={e => console.log('unhover')}>
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

The `Canvas` object is your portal into Threejs. It renders Threejs elements, *not dom element*!

```jsx
<Canvas
  children                      // Either a function child (which receives state) or regular children
  gl                            // These props go into the webGL renderer
  camera                        // And these go in to the default camera
  pixelRatio = undefined        // You could provide window.devicePixelRatio if you like 
  invalidateFrameloop = false   // When true it only renders on changes, when false it's a game loop
  onCreated />                  // Callback when vdom is ready, return a promise to prevent FOC
```

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

All properties that have a `.set()` method (colors, vectors, euler, matrix, etc) can be given a shortcut. For example [THREE.Color.set](https://threejs.org/docs/index.html#api/en/math/Color.set) can take a color string, hence instead of `color={new THREE.Color('peachpuff')` you can do `color="peachpuff"`. Some set-methods take multiple arguments (vectors for instance), in this case you can pass an array.

You can stow away non-Object3D primitives (geometries, materials, etc) into the render tree so that they become managed and reactive. They take the same properties they normally would, constructor arguments are passed with `args`. Using the `attach` property objects bind automatically to their parent and are taken off it once they unmount.

The following is the same as above, but it's leaner and critical properties aren't re-instanciated on every render.

```jsx
<mesh visible userData={{ test: "hello" }} position={[1, 2, 3]} rotation={[0, 0, 0]}>
  <sphereGeometry attach="geometry" args={[1, 16, 16]} />
  <meshStandardMaterial attach="material" color="indianred" transparent />
</mesh>
```

You can nest primitive objects, which is good for awaiting async textures and such. You could use React-suspense if you wanted!

```jsx
<meshBasicMaterial attach="material">
  <texture attach="map" format={THREE.RGBFormat} image={img} onUpdate={self => img && (self.needsUpdate = true)} />
</meshBasicMaterial>
```

Sometimes attaching isn't enough, for instance effects cling to an array called "passes" of a the parental effect-composer. In that case you use `attachArray` which adds the object to the target array and takes it out on unmount:

```jsx
<effectComposer>
  <renderPass attachArray="passes" />
  <glitchPass attachArray="passes" renderToScreen />
</effectComposer>
```

You can also attach to named parent properties using `attachObject={[target, name]}`, which adds the object and takes it out on unmount. The following adds a buffer-attribute to parent.attributes.position. 

```jsx
<bufferGeometry>
  <bufferAttribute attachObject={['attributes', 'position']} array={vertices} itemSize={3} />
</bufferGeometry>
```

#### Piercing into nested properties

If you want to reach into nested attributes (for instance: `mesh.rotation.x`), just use dash-case:

```jsx
<mesh rotation-x={1} material-color="lightblue" geometry-vertices={newVertices} />
```

#### Extending or using arbitrary objects

When you need managed local (or custom/extended) objects, you can use the `primitive` placeholder.

```jsx
const mesh = new THREE.Mesh()
return <primitive object={mesh} />
```

# Events

THREE objects that implement their own `raycast` method (for instance meshes, lines, etc) can be interacted with by declaring events on the object. For now that's prop-updates (very useful for things like `verticesNeedUpdate`) and mouse events. Touch follows soon!

```jsx
<mesh
  onClick={e => console.log('click')}
  onMouseUp={e => console.log('mouse button up')}
  onMouseDown={e => console.log('mouse button down')}
  onMouseEnter={e => console.log('hover')}
  onMouseLeave={e => console.log('unhover')}
  onMouseMove={e => console.log('mouse moves')}
  onWheel={e => console.log('wheel spins')}
  onUpdate={self => console.log('props have been updated')}
/>
```

# Hooks

All hooks can only be used *inside* the Canvas element because they rely on context updates!

#### useThree

```jsx
import { useThree } from 'react-three-fiber'

const { 
  gl,               // WebGL renderer
  canvas,           // canvas the dom element that was created
  scene,            // Default scene
  camera,           // Default camera
  size,             // Bounds of the view (which stretches 100% and auto-adjusts)
  viewport,         // Bounds of the viewport in 3d units
  invalidate,       // Invalidates a single frame (for <Canvas invalidateFrameloop />)
  setDefaultCamera  // Sets the default camera
} = useThree()
```

#### useRender

If you're running effects, postprocessings, controls, etc that need to get updated every frame, useRender gives you access to the render-loop. You receive the internal state as well, which is the same as what you would get from useThree.

```jsx
import { useRender } from 'react-three-fiber'

// Subscribes to the render-loop, gets cleaned up automatically when the component unmounts
useRender(state => console.log("i'm in the render-loop"))

// Add a "true" as the 2nd argument and you take over the render-loop completely
useRender(({ gl, scene, camera }) => gl.render(scene, camera), true)
```

#### useUpdate

Sometimes objects have to be updated imperatively. You could update the parts that you can access declaratively and then call `onUpdate={self => ...}`, or there's useUpdate. 

```jsx
import { useUpdate } from 'react-three-fiber'

const ref = useUpdate( 
  geometry => {
    geometry.addAttribute('position', getCubeVertices(x, y, z))
    geometry.attributes.position.needsUpdate = true
    geometry.computeBoundingSphere()
  }, 
  [x, y, z] // execute only if these properties change
)
return <bufferGeometry ref={ref} />
```

# Receipes

## Handling loaders

You can use Reacts built-in memoizing-features (as well as suspense) to build async dependence graphs.

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
  useEffect(() => void composer.current.obj.setSize(size.width, size.height), [size])
  // This takes over as the main render-loop (when 2nd arg is set to true)
  useRender(() => composer.current.obj.render(), true)
  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" args={[scene, camera]} />
      <glitchPass attachArray="passes" factor={factor} renderToScreen />
    </effectComposer>
  )
}
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
  paths={[
    [25, 25, 20, 0, 0, 0],
    [30, 0, 30, 35,30,35],
    [30, 55, 10, 77, 25, 95],
    [60, 77, 80, 55, 80, 35],
    [80, 35, 80, 0, 50, 0],
    [35, 0, 25, 25, 25, 25],
  ]}
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

## Switching the default renderer

If you want to exchange the default renderer you can. But, you will loose some of the functionality, like useRender, useThree, events, which is all covered in canvas.

```jsx
import { render, unmountComponentAtNode } from 'react-three-fiber'

const renderer = new THREE.SVGRenderer()
renderer.setClearColor(0x000000)
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 35
const scene = new THREE.Scene()

render((
  <mesh>
    <sphereGeometry name="geometry" args={[1, 16, 16]} />
    <meshBasicMaterial name="material" />
  </mesh>
), scene)
```
