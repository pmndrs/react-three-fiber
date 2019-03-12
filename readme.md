<p align="center">
  <a href="https://codesandbox.io/embed/ly0oxkp899"><img width="865" src="https://i.imgur.com/vjmDwpS.gif" /></a>
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
import * as THREE from 'three/src/Three'
import React from 'react'
import ReactDOM from 'react-dom'
import { Canvas } from 'react-three-fiber'
import './styles.css' // Make sure to give #root a size, or the canvas will stretch

function Thing({ vertices, color }) {
  return (
    <group ref={ref => console.log('we have access to the instance')}>
      <line>
        <geometry
          name="geometry"
          vertices={vertices.map(v => new THREE.Vector3(...v))}
          onUpdate={self => (self.verticesNeedUpdate = true)}
        />
        <lineBasicMaterial name="material" color="black" />
      </line>
      <mesh 
        onClick={e => console.log('click')} 
        onHover={e => console.log('hover')} 
        onUnhover={e => console.log('unhover')}>
        <octahedronGeometry name="geometry" />
        <meshBasicMaterial name="material" color="peachpuff" opacity={0.5} transparent />
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

You can stow away non-Object3D primitives (geometries, materials, etc) into the render tree so that they become managed and reactive. They take the same properties they normally would, constructor arguments are passed with `args`. If you give them a name they attach automatically to their parent.

The following is the same as above, but it's leaner and critical properties aren't re-instanciated on every render.

```jsx
<mesh visible userData={{ test: "hello" }} position={[1, 2, 3]} rotation={[0, 0, 0]}>
  <sphereGeometry name="geometry" args={[1, 16, 16]} />
  <meshStandardMaterial name="material" color="indianred" transparent />
</mesh>
```

You can nest primitive objects, good for awaiting async textures and such. You could use React-suspense if you wanted!

```jsx
<meshBasicMaterial name="material">
  <texture name="map" format={THREE.RGBFormat} image={img} onUpdate={self => img && (self.needsUpdate = true)} />
</meshBasicMaterial>
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

THREE objects that implement their own `raycast` method (for instance meshes, lines, etc) can be interacted with by declaring events on the object. For now that's prop-updates (very useful for things like `verticesNeedUpdate`), hovering-state and clicks. Touch follows soon!

```jsx
<mesh
  onClick={e => console.log('click')}
  onHover={e => console.log('hover')}
  onUnhover={e => console.log('unhover')}
  onUpdate={self => console.log('props have been updated')}
/>
```

# Gl data & hooking into the render loop

Sometimes you're running effects, postprocessing, etc that needs to get updated. You can fetch the renderer, the camera, scene, and a render-loop subscribe to do this.

```jsx
import { Canvas, useRender, useThree } from 'react-three-fiber'

function App() {
  // gl is the webgl-renderer
  // canvas the dom element that was created
  // size the bounds of the view (which stretches 100% and auto-adjusts)
  // viewport is the calculated screen-size, it's a function
  const { gl, canvas, scene, camera, size, viewport } = useThree()
  // Subscribes to the render-loop, gets cleaned up automatically when the component unmounts
  // Add a "true" as the 2nd argument and you take over the render-loop
  useRender(({ gl, canvas, scene, camera }) => console.log("i'm in the render-loop"))
  return <group />
}
```

# Receipes

## Handling loaders

You can use Reacts built-in memoizing-features (as well as suspense) to build async dependence graphs.

```jsx
function Image({ url }) {
  const texture = useMemo(() => new THREE.TextureLoader().load(url), [url])
  return (
    <mesh>
      <planeBufferGeometry name="geometry" args={[1, 1]} />
      <meshLambertMaterial name="material" transparent>
        <primitive name="map" object={texture} />
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
      <renderPass name="passes" args={[scene, camera]} />
      <glitchPass name="passes" factor={factor} renderToScreen />
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
      <extrudeGeometry name="geometry" args={[shape, props]} />
      <meshPhongMaterial name="material" />
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
