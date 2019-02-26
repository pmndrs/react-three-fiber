    npm install react-three-fiber

React-three-fiber is a small React renderer for THREE-js. Regular THREE can sometimes lend to complex code due to non-reactive mutation and imperative layout-inflating.

By driving THREE as a render-target building scene graphs is easier since the graph can be componentized declaratively with clean, reactive semantics. This also opens up the eco system, you now apply generic packages for state, animation, gestures, etc.

### Objects and attributes

You can access the entirety of [THREE's object catalogue as well as all of their properties](https://threejs.org/docs). If you want to reach into nested attributes (for instance: `mesh.rotation.x`), just use dash-case (`<mesh rotation-x={...} />`). This renderer doesn't change THREE's semantics other than using JSX, it does not introduce any regression or limit.

### Events

THREE objects that implement their own `raycast` method (for instance meshes, lines, etc) can be interacted with by declaring events on the object. For now that's hovering state, clicks and drag'n'drop.

### Difference to react-three, react-three-renderer, react-three-renderer-fiber

From how it looks to me, some of these aren't maintained, chained to React 15, highly specific and/or complex. This lib just ships a small reconciler config with a few additions for interaction. It does not know, care about or duplicate THREE's object catalogue. It uses a few heuristics to support attributes and that is all.

# Example

```jsx
import { Canvas } from 'react-three-fiber'

function App() {
  return (
    <Canvas>
      <group>
        <mesh
          // You get full access to the instance with a reference
          ref={ref => console.log(ref)}
          // You can set any object on the instance
          geometry={new THREE.BoxGeometry(1, 1, 1)}
          material={new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true })}
          // Read-only props in THREE that have a ".set" function can still be written to
          scale={new Vector3(2, 2, 2)}
          // Or by an array that gets spread over the internal ".set(...)" function
          scale={[2, 2, 2]}
          // You are also allowed to pierce into the instance
          scale-x={3}
          // ... which works for everything, even materials
          material-color={new THREE.Color(0xff0000)}
          // And since it's using ".set(...)", you can feed it all the values it can take
          material-color={'rgb(100, 200, 50)'}
          // Interaction comes inbuilt
          onHover={e => console.log('hovered', e)}
          onUnhover={e => console.log('unhovered', e)}
          onClick={e => console.log('clicked', e)}
          onPick={e => console.log('picked', e)}
          onDrag={e => console.log('dragged', e)}
          onDrop={e => console.log('dropped', e)}
        />
        <line
          geometry={new THREE.Geometry()}
          material={new THREE.LineBasicMaterial({ color: 0xffffff })}
          // With piercing you can even declare mesh/vertice data declaratively
          geometry-vertices={[[-1,0,0],[0,1,0],[1,0,0]].map(v => new THREE.Vector3(...v))}
        />
      </group>
    </Canvas>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
```

# Custom config

GL-props, camera and some events allow you to customize the render-session.

```jsx
function App() {
  const cam = useRef()
  return (
    <Canvas
      camera={cam}
      glProps={ antialias: true }
      onCreated={(gl, camera, pool scene) => console.log("gl created")}
      onUpdate={(gl, camera, pool scene) => console.log("i'm in the render-loop")}>
      <perspectiveCamera
        ref={cam}
        fov={75}
        near={0.1}
        far={1000} />
      <SpinningBox />
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

Sometime you're running effects, postprocessing, etc that needs to get updated. You can fetch the renderer, the camera, scene, and a render-loop subscribe to do this.

```jsx
import { Canvas, useRender, useThree } from 'react-three-fiber'

function App() {
  // Just fetching data
  const { gl, canvas, scene, camera } = useThree()
  // Subscribing to the render-loop
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
