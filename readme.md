<h1>react-three-fiber</h1>

[![Version](https://img.shields.io/npm/v/@react-three/fiber?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/fiber)
[![Downloads](https://img.shields.io/npm/dt/react-three-fiber.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/fiber)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000)](https://discord.gg/ZZjjNvJ)
[![Open Collective](https://img.shields.io/opencollective/all/react-three-fiber?style=flat&colorA=000000&colorB=000000)](https://opencollective.com/react-three-fiber)
[![ETH](https://img.shields.io/badge/ETH-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/eth/address/0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682)
[![BTC](https://img.shields.io/badge/BTC-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/btc/address/36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH)

react-three-fiber is a <a href="https://reactjs.org/docs/codebase-overview.html#renderers">React renderer</a> for threejs.

```bash
npm install three @react-three/fiber
```

### Why?

Build your scene declaratively with re-usable, self-contained components that react to state, are readily interactive and can tap into React's ecosystem.

#### Does it have limitations?

None. Everything that works in threejs will work here without exception.

#### Can it keep up with frequent updates to threejs?

Yes, because it merely expresses threejs in JSX: `<mesh />` becomes `new THREE.Mesh()`, and that happens dynamically. There is no hard dependency on a particular threejs version, it does not wrap or duplicate a single threejs class.

#### Is it slower than plain threejs?

There is no additional overhead. Components participate in the renderloop outside of React.

### What does it look like?

<table>
  <tr>
    <td>Let's make a re-usable component that has its own state, reacts to user-input and participates in the render-loop. (<a href="https://codesandbox.io/s/rrppl0y8l4?file=/src/App.js">live demo</a>).</td>
    <td>
      <a href="https://codesandbox.io/s/rrppl0y8l4">
        <img src="https://i.imgur.com/sS4ArrZ.gif" /></td>
      </a>
  </tr>
</table>

```jsx
import ReactDOM from 'react-dom'
import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

function Box(props) {
  // This reference will give us direct access to the THREE.Mesh object
  const mesh = useRef()
  // Set up state for the hovered and active state
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => (mesh.current.rotation.x += 0.01))
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={mesh}
      scale={active ? 1.5 : 1}
      onClick={(event) => setActive(!active)}
      onPointerOver={(event) => setHover(true)}
      onPointerOut={(event) => setHover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

ReactDOM.render(
  <Canvas>
    <ambientLight />
    <pointLight position={[10, 10, 10]} />
    <Box position={[-1.2, 0, 0]} />
    <Box position={[1.2, 0, 0]} />
  </Canvas>,
  document.getElementById('root'),
)
```

<details>
  <summary>Show TypeScript example</summary>
  
```bash
npm install @types/three
```

```tsx
import * as THREE from 'three'
import ReactDOM from 'react-dom'
import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

function Box(props: JSX.IntrinsicElements['mesh']) {
  const mesh = useRef<THREE.Mesh>(null!)
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)
  useFrame((state, delta) => (mesh.current.rotation.x += 0.01))
  return (
    <mesh
      {...props}
      ref={mesh}
      scale={active ? 1.5 : 1}
      onClick={(event) => setActive(!active)}
      onPointerOver={(event) => setHover(true)}
      onPointerOut={(event) => setHover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

ReactDOM.render(
  <Canvas>
    <ambientLight />
    <pointLight position={[10, 10, 10]} />
    <Box position={[-1.2, 0, 0]} />
    <Box position={[1.2, 0, 0]} />
  </Canvas>,
  document.getElementById('root'),
)
```

Live demo: https://codesandbox.io/s/icy-tree-brnsm?file=/src/App.tsx

</details>

---

# Documentation, tutorials, examples

Visit [docs.pmnd.rs](https://docs.pmnd.rs/react-three-fiber)

<a href="https://docs.pmnd.rs/react-three-fiber"><img src="/markdown/docs.jpg"></a>

# Fundamentals

You need to be versed in both React and Threejs before rushing into this. If you are unsure about React consult the official [React docs](https://reactjs.org/docs/getting-started.html), especially [the section about hooks](https://reactjs.org/docs/hooks-reference.html). As for Threejs, make sure you at least glance over the following links:

1. Make sure you have a [basic grasp of Threejs](https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene). Keep that site open.
2. When you know what a scene is, a camera, mesh, geometry, material, fork the [demo above](https://github.com/react-spring/react-three-fiber#what-does-it-look-like).
3. [Look up](https://threejs.org/docs/index.html#api/en/objects/Mesh) the JSX elements that you see (mesh, ambientLight, etc), _all_ threejs exports are native to three-fiber.
4. Try changing some values, scroll through our [Api](/markdown/api.md) to see what the various settings and hooks do.

Some reading material:

- [Threejs-docs](https://threejs.org/docs)
- [Threejs-examples](https://threejs.org/examples)
- [Threejs-fundamentals](https://threejsfundamentals.org)
- [Discover Threejs](https://discoverthreejs.com)
- [Do's and don'ts](https://discoverthreejs.com/tips-and-tricks) for performance and best practices
- [react-three-fiber alligator.io tutorial](https://alligator.io/react/react-with-threejs) by [@dghez\_](https://twitter.com/dghez_)

# Ecosystem

- [`@react-three/gltfjsx`](https://github.com/react-spring/gltfjsx) &ndash; turns GLTFs into JSX components
- [`@react-three/drei`](https://github.com/react-spring/drei) &ndash; useful helpers for react-three-fiber
- [`@react-three/postprocessing`](https://github.com/react-spring/react-postprocessing) &ndash; post-processing effects
- [`@react-three/flex`](https://github.com/react-spring/react-three-flex) &ndash; flexbox for react-three-fiber
- [`@react-three/xr`](https://github.com/react-spring/react-xr) &ndash; VR/AR controllers and events
- [`@react-three/cannon`](https://github.com/react-spring/use-cannon) &ndash; physics based hooks
- [`zustand`](https://github.com/react-spring/zustand) &ndash; state management
- [`react-spring`](https://github.com/react-spring/react-spring) &ndash; a spring-physics-based animation library
- [`react-use-gesture`](https://github.com/react-spring/react-use-gesture) &ndash; mouse/touch gestures
- [`leva`](https://github.com/pmndrs/leva) &ndash; create GUI controls in seconds

# How to contribute

If you like this project, please consider helping out. All contributions are welcome as well as donations to [Opencollective](https://opencollective.com/react-three-fiber), or in crypto `BTC: 36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH`, `ETH: 0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682`.

#### Backers

Thank you to all our backers! 🙏

<a href="https://opencollective.com/react-three-fiber#backers" target="_blank">
  <img src="https://opencollective.com/react-three-fiber/backers.svg?width=890"/>
</a>

#### Contributors

This project exists thanks to all the people who contribute.

<a href="https://github.com/pmndrs/react-three-fiber/graphs/contributors">
  <img src="https://opencollective.com/react-three-fiber/contributors.svg?width=890" />
</a>
