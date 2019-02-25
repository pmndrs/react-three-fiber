    npm install react-three-fiber

React-three-fiber is a small React renderer for THREE. By driving THREE as a render-target it's not only easier to build complex and reactive scene graphs, but you can apply generic React-eco-system packages to it for state, animation, etc.

### Objects and attributes

You can access the entirety of THREE's object catalogue as well as all of its properties. If you want to reach into nested attributes (for instance: mesh.rotation.x), just use camelCase. 

### Events

THREE objects that implement their own `raycast` method (for instance meshes) can be interacted with by declaring events on the object. For now that's hovering state, clicks and drag'n'drop.

# Example

```jsx
import * as THREE from 'three'
import React, { useRef, useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Canvas } from 'react-three-fiber'

function App() {
  const boxRef = useRef()
  const [show, toggle] = useState(true)

  useEffect(() => {
    // You have access to the raw THREE components
    console.log(boxRef)
    // Like any other React component, the scene graph is reactive
    setTimeout(() => toggle(false), 2000)
  }, [])

  return (
     <Canvas>
        <group>
          {show && (
            <mesh
              ref={boxRef}
              geometry={new THREE.BoxGeometry(1, 1, 1)}
              material={new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true })}
              materialColor={new THREE.Color(0xff0000)}
              rotationX={2}
              onHover={e => console.log("hovered", e)}
              onUnhover={e => console.log("unhovered", e)}
              onClick={e => console.log("clicked", e)}
              onPick={e => console.log("picked", e)}
              onDrag={e => console.log("dragdge", e)}
              onDrop={e => console.log("dropped", e)}
            />
          )}
        </group>
    </Canvas>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
```

# Custom config

```jsx
<Canvas
  camera={new THREE.PerspectiveCamera(75, 0, 0.1, 1000)}
  glProps={ aleased: true }
  onCreate={(gl, camera, pool scene) => console.log("gl created")}
  onUpdate={(gl, camera, pool scene) => console.log("i'm in the render-loop")}
/>
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