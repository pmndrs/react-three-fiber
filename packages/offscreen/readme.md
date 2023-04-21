<h1>react-three-offscreen</h1>

[![Version](https://img.shields.io/npm/v/@react-three/offscreen?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/offscreen)
[![Downloads](https://img.shields.io/npm/dt/react-three-fiber.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/offscreen)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000)](https://discord.gg/ZZjjNvJ)
[![Open Collective](https://img.shields.io/opencollective/all/react-three-fiber?style=flat&colorA=000000&colorB=000000)](https://opencollective.com/react-three-fiber)
[![ETH](https://img.shields.io/badge/ETH-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/eth/address/0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682)
[![BTC](https://img.shields.io/badge/BTC-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/btc/address/36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH)

```bash
npm install three @react-three/fiber @react-three/offscreen
```

This is an experimental package that allows you to render your [react-three-fiber](https://github.com/pmndrs/react-three-fiber) scene with an offscreen canvas in a web worker. This is mostly useful for self-contained webgl apps, and un-blocking the main thread.

The package will forward DOM events to the worker so you can expect mostly everything to run fine. It will even shim a basic document/window interface so that camera controls and various threejs classes that must interact with the DOM have something to work with.

For better interop all non-passive events (click, contextmenu, dlbclick) will preventDefault, pointerdown will capture, pointerup will release capture.

## Usage

Instead of importing `<Canvas>` from `@react-three/fiber` you can import it from `@react-three/offscreen` and pass a `worker` prop. The `fallback` prop is optional, your scene will be rendered on the main thread, in a regular canvas, where OffscreenCanvas is not supported (Safari).

It takes all other props that `<Canvas>` takes (dpr, shadows, etc), you can use it as a drop-in replacement.

```jsx
// App.js (main thread)
import { Canvas } from '@react-three/offscreen'

// This is the fallback component that will be rendered on the main thread
// This will happen on systems where OffscreenCanvas is not supported
const Scene = React.lazy(() => import('./Scene'))
// This is the worker thread that will render the scene
const worker = new Worker(new URL('./worker.js', import.meta.url))

export default function App() {
  return <Canvas shadows camera={{ position: [0, 5, 10], fov: 25 }} worker={worker} fallback={<Scene />} />
}
```

Your worker thread will be responsible for rendering the scene. The `render` function takes a single argument, a ReactNode.

```jsx
// worker.js (worker thread)
import { render } from '@react-three/offscreen'

render(<Scene />)
```

Your app or scene should be self contained, meaning it shouldn't interact with the DOM. This is because offscreen canvas + webgl is still not supported in Safari. If you must communicate with the DOM, you can use the web broadcast API.

```jsx
// Scene.js (a self contained webgl app)
import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, CameraControls } from '@react-three/drei'

function Cube(props) {
  const mesh = useRef()
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)
  useFrame((state, delta) => {
    mesh.current.rotation.x += delta
    mesh.current.rotation.y += delta
  })
  return (
    <>
      <mesh
        {...props}
        ref={mesh}
        scale={active ? 1.25 : 1}
        onClick={(e) => (e.stopPropagation(), setActive(!active))}
        onPointerOver={(e) => (e.stopPropagation(), setHover(true))}
        onPointerOut={(e) => setHover(false)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
      </mesh>
      <ContactShadows color={hovered ? 'hotpink' : 'orange'} position={[0, -1.5, 0]} blur={3} opacity={0.75} />
    </>
  )
}

export default function App() {
  return (
    <>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Cube />
      <Environment preset="city" />
      <CameraControls />
    </>
  )
}
```

## How to contribute

If you like this project, please consider helping out. All contributions are welcome as well as donations to [Opencollective](https://opencollective.com/react-three-fiber), or in crypto `BTC: 36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH`, `ETH: 0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682`.

### Backers

Thank you to all our backers! 🙏

<a href="https://opencollective.com/react-three-fiber#backers" target="_blank">
  <img src="https://opencollective.com/react-three-fiber/backers.svg?width=890"/>
</a>

### Contributors

This project exists thanks to all the people who contribute.

<a href="https://github.com/pmndrs/react-three-fiber/graphs/contributors">
  <img src="https://opencollective.com/react-three-fiber/contributors.svg?width=890" />
</a>
