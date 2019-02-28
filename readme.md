<p align="center">
  <a href="https://codesandbox.io/embed/9y8vkjykyy"><img src="https://i.imgur.com/NNb6QoP.gif" /></a>
</p>
<p align="middle">
  <i>This demo is real, click it!</i>
</p>

    npm install react-three-fiber

    

React-three-fiber is a small React renderer for THREE-js. Regular THREE can sometimes produce rather complex code due to everything being non-reactive, mutation and imperative layout-inflating.

Driving something like THREE as a render-target makes just as much sense as it makes for the DOM. Building a  complex scene graph becomes easier because it can be componentized declaratively with clean, reactive semantics. This also opens up the eco system, you can now apply generic packages for state, animation, gestures, etc.

#### Difference to react-three, react-three-renderer, react-three-renderer-fiber

Some of the above mentioned aren't maintained any longer, or chained to React 15, or quite specific. This lib just ships a small reconciler config with a few additions for interaction. It does not know, care about or duplicate THREE's object catalogue, it uses heuristics to support attributes generically.

# How it looks

```jsx
import { Canvas } from 'react-three-fiber'

function Thing({ vertices, color }) {
  return (
    <group ref={ref => console.log('we have access to the instance')}>
      <line position={[10, 20, 30]} rotation={[THREE.Math.degToRad(90), 0, 0]}>
        <geometry name="geometry" vertices={vertices.map(v => new THREE.Vector3(...v))} />
        <lineBasicMaterial name="material" color={color} />
      </line>
      <mesh
        onClick={e => console.log('click')}
        onHover={e => console.log('hover')}
        onUnhover={e => console.log('unhover')}>
        <octahedronGeometry name="geometry" />
        <meshStandardMaterial name="material" color="grey" opacity={0.5} transparent />
      </mesh>
    </group>
  )
}

ReactDOM.render(
  <Canvas>
    <Thing color="blue" vertices={[[-1, 0, 0], [0, 1, 0], [1, 0, 0]]} />
  </Canvas>,
  document.getElementById('root')
)
```

# Objects and properties

You can access the entirety of [THREE's object catalogue as well as all of their properties](https://threejs.org/docs). If you are in doubt about something, always consult the docs.

```jsx
<mesh
  visible
  userData={ test: "hello" }
  position={new THREE.Vector3(1, 2, 3)}
  rotation={new THREE.Euler(0, 0, 0)}
  geometry={new THREE.SphereGeometry(1, 16, 16)}
  material={new THEE.MeshBasicMaterial({ color: new THREE.Color('indianred'), transparent: true })} />
```

#### Shortcuts and non-Object3D stow-away

All properties that have a `.set()` method (colors, vectors, euler, matrix, etc) can be given a shortcut. For example [THREE.Color.set](https://threejs.org/docs/index.html#api/en/math/Color.set) can take a color string, hence instead of `color={new THREE.Color('peachpuff')` you can do `color="pachpuff"`. Some set-methods take multiple arguments (vectors for instance), in this case you can pass an array. 

You can stow away non-Object3D primitives (geometries, materials, etc) into the render tree so that they become managed and reactive. They take the same properties they normally would, constructor arguments are passed with `args`. If you give them a name they attach automatically to their parent.

The following is the same as above, but it's leaner and critical properties aren't re-instanciated on every render.

```jsx
<mesh visible userData={ test: "hello" } position={[1, 2, 3]} rotation={[0, 0, 0]}>
  <sphereGeometry name="geometry" args={[1, 16, 16]} />
  <meshStandardMaterial name="material" color="indianred" transparent />
</mesh>
```

#### Piercing into nested properties

If you want to reach into nested attributes (for instance: `mesh.rotation.x`), just use dash-case:

```jsx
<mesh rotation-x={1} material-color="lightblue" geometry-vertices={newVertices} />
```

# Events

THREE objects that implement their own `raycast` method (for instance meshes, lines, etc) can be interacted with by declaring events on the object. For now that's hovering state and clicks. Touch follows soon!

# Custom config

GL-props, camera and some events allow you to customize the render-session.

```jsx
function App() {
  const cam = useRef()
  return (
    <Canvas
      camera={cam}
      glProps={{ antialias: true }}
      onCreated={({ gl, canvas, scene, camera }) => console.log('gl created')}
      onUpdate={({ gl, canvas, scene, camera }) => console.log("i'm in the render-loop")}
      render={({ gl, canvas, scene, camera }) => gl.render(scene, camera)}>
      <perspectiveCamera ref={cam} fov={75} near={0.1} far={1000} />
    </Canvas>
  )
}
```

# Extending or using arbitrary objects

Wrap the `primitive` placeholder around custom or extended THREE-objects that you want to render into the scene-graph.

```jsx
const geo = new THREE.BoxGeometry(10, 0.1, 0.1)
const mat = new THREE.MeshBasicMaterial({ transparent: true })
const msh = new MyExtendedMesh(geo, mat)
return <primitive object={msh} />
```

# Gl data & hooking into the render loop

Sometimes you're running effects, postprocessing, etc that needs to get updated. You can fetch the renderer, the camera, scene, and a render-loop subscribe to do this.

```jsx
import { Canvas, useRender, useThree } from 'react-three-fiber'

function App() {
  // Just fetching data
  const { gl, canvas, scene, camera } = useThree()
  // Subscribing to the render-loop, gets cleaned up automatically when the component unmounts
  useRender(({ gl, canvas, scene, camera }) => console.log("i'm in the render-loop"))
  return <group />
}
```

# Custom canvas

The default `Canvas` component is just a effect around the canvas element. You can implement your own.

```jsx
import * as THREE from 'three'
import React, { useRef, useEffect } from 'react'
import { render, unmountComponentAtNode } from 'react-three-fiber'

export function Canvas({ children }) {
  const canvasRef = useRef()
  const active = useRef(true)

  useEffect(() => {
    // Create THREE renderer
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.position.z = 5
    // Create render-loop
    const renderLoop = function() {
      if (!active.current) return
      requestAnimationFrame(renderLoop)
      renderer.render(scene, camera)
    }
    // Render children into scene
    render(children, scene)
    // Start render-loop
    renderLoop()
    // Clean-up
    () => {
      active.current = false
      unmountComponentAtNode(scene)
    }
  }, [])
  // Render canvas container into the DOM
  return <canvas ref={canvasRef} />
}
```

# Todo

1. There are still lots of objects you need to create outside of the render tree (geometries, materials, vectors, etc). THREE usually wouldn't allow them inside the scene. I am still thinking on how to solve this, i'd like them to be in the render-tree so that they can be reactive. 🤔

2. Not sure it's a good idea to abstract the renderer away with `Canvas`, probably will be possible to declaratively define it soon.
