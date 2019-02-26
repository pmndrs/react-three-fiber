    npm install react-three-fiber

React-three-fiber is a small React renderer for THREE. By driving THREE as a render-target it's not only easier to build complex and scene graphs, but you can apply generic React-eco-system packages to it for state, animation, etc.

### Objects and attributes

You can access the entirety of THREE's object catalogue as well as all of its properties. If you want to reach into nested attributes (for instance: mesh.rotation.x), just use dash-case.

### Events

THREE objects that implement their own `raycast` method (for instance meshes) can be interacted with by declaring events on the object. For now that's hovering state, clicks and drag'n'drop.

# Example

```jsx
import { Canvas } from 'react-three-fiber'

function App({ visible }) {
  const boxRef = useRef()
  return (
    <Canvas>
      <group>
        {visible &&
          <mesh
            // You get full access to the instance with a reference
            ref={boxRef}
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
            onDrag={e => console.log('dragdge', e)}
            onDrop={e => console.log('dropped', e)}
          />
        }
      </group>
    </Canvas>
  )
}

ReactDOM.render(<App visible/>, document.getElementById('root'))
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
      onCreate={(gl, camera, pool scene) => console.log("gl created")}
      onUpdate={(gl, camera, pool scene) => console.log("i'm in the render-loop")}>
      <perspectiveCamera
        ref={cam}
        fov={75}
        aspect={window.innerWidth / window.innerHeight}
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
