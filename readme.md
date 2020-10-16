<h1>react-three-fiber</h1>

[![Build Status](https://img.shields.io/travis/react-spring/react-three-fiber?style=flat&colorA=f5f5f5&colorB=f5f5f5)](https://travis-ci.org/react-spring/react-three-fiber)
[![Version](https://img.shields.io/npm/v/react-three-fiber?style=flat&colorA=f5f5f5&colorB=f5f5f5)](https://npmjs.com/package/react-three-fiber)
[![Downloads](https://img.shields.io/npm/dt/react-three-fiber.svg?style=flat&colorA=f5f5f5&colorB=f5f5f5)](https://npmjs.com/package/react-three-fiber)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=f5f5f5&colorB=f5f5f5&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=f5f5f5&colorB=f5f5f5&label=discord&logo=discord&logoColor=000000)](https://discord.gg/ZZjjNvJ)

[![Open Collective](https://img.shields.io/opencollective/all/react-three-fiber?style=flat&colorA=f5f5f5&colorB=f5f5f5)](https://opencollective.com/react-three-fiber)
[![ETH](https://img.shields.io/badge/ETH-0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682-f5f5f5?style=flat&colorA=f5f5f5&logo=ethereum&logoColor=000000)](https://blockchain.com/eth/address/0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682)
[![BTC](https://img.shields.io/badge/BTC-36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH-f5f5f5?style=flat&colorA=f5f5f5&logo=bitcoin&logoColor=000000)](https://blockchain.com/btc/address/36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH)

react-three-fiber is a React <a href="https://reactjs.org/docs/codebase-overview.html#renderers">renderer</a> for threejs on the web and react-native.

```bash
npm install three react-three-fiber
```

<p align="center">
  <a href="https://codesandbox.io/embed/r3f-game-i2160"><img width="274" src="https://i.imgur.com/VydCh6W.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-gamma-correction-kmb9i"><img width="274" src="https://i.imgur.com/e6NhRz6.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-montage-jz9l97qn89"><img width="274" src="https://i.imgur.com/nxRStP8.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-sparks-sbf2i"><img width="274" src="https://i.imgur.com/Fk44Tu6.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-instanced-colors-8fo01"><img width="274" src="https://i.imgur.com/daJIDVE.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-moksha-f1ixt"><img width="274" src="https://i.imgur.com/ltznOJ1.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-bones-3i7iu"><img width="274" src="https://i.imgur.com/OZdSyQy.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-floating-diamonds-prb9t"><img width="274" src="https://i.imgur.com/WWDbcWG.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-volumetric-light-w633u"><img width="274" src="https://i.imgur.com/7E3XKSG.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-particles-ii-pjcc1"><img width="274" src="https://i.imgur.com/QG14IAC.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-gltf-fonts-c671i"><img width="274" src="https://i.imgur.com/SHPhIls.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-cannon-physics-nr84m"><img width="274" src="https://i.imgur.com/M9rupWP.gif" /></a>
  <a href="https://codesandbox.io/embed/wonderful-chandrasekhar-8l9rrj36j0"><img width="274" src="https://i.imgur.com/HSTGdcO.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-train-l900i"><img width="274" src="https://i.imgur.com/B3AzZVH.gif" /></a>
  <a href="https://codesandbox.io/embed/r3f-particles-i-q4d2v"><img width="274" src="https://i.imgur.com/XscsWgu.gif" /></a>
</p>
<p align="middle">
  <i>These demos are real, you can click them! They contain the full code, too.</i>
</p>

#### Why?

Building dynamic scene graphs declaratively with re-usable components makes dealing with threejs easier and brings order and sanity to your codebase. These components react to state changes, are interactive out of the box and can tap into React's infinite ecosystem.

#### Does it have limitations?

None. Everything that works in threejs will work here. In contrast to "bindings" where a library ships/maintains dozens of wrapper components, it just renders JSX to threejs dynamically: `<mesh />` simply is another expression for `new THREE.Mesh()`. It does not know or target a specific threejs version nor does it need updates for modified, added or removed upstream features.

#### Is it slower than raw threejs?

No. Rendering performance is up to threejs and the GPU. Components participate in the renderloop outside of React, without any additional overhead. React is otherwise very efficient in building and managing component-trees, it could potentially outperform manual/imperative apps at scale.

#### What does it look like?

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
import { Canvas, useFrame } from 'react-three-fiber'

function Box(props) {
  // This reference will give us direct access to the mesh
  const mesh = useRef()

  // Set up state for the hovered and active state
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)

  // Rotate mesh every frame, this is outside of React without overhead
  useFrame(() => (mesh.current.rotation.x = mesh.current.rotation.y += 0.01))

  return (
    <mesh
      {...props}
      ref={mesh}
      scale={active ? [1.5, 1.5, 1.5] : [1, 1, 1]}
      onClick={(e) => setActive(!active)}
      onPointerOver={(e) => setHover(true)}
      onPointerOut={(e) => setHover(false)}
    >
      <boxBufferGeometry args={[1, 1, 1]} />
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
  document.getElementById('root')
)
```

---

# Fundamentals

1. Make sure you have a [basic grasp of Threejs](https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene). Keep that site open.
2. When you know what a scene is, a camera, mesh, geometry, material, fork the [demo above](https://github.com/react-spring/react-three-fiber#what-does-it-look-like).
3. [Look up](https://threejs.org/docs/index.html#api/en/objects/Mesh) the JSX elements that you see (mesh, ambientLight, etc), _all_ threejs exports are native to three-fiber.
4. Try changing some values, scroll though our [Api](api.md) to see what the various settings and hooks do.

Some reading material:

- [Threejs-docs](https://threejs.org/docs)
- [Threejs-examples](https://threejs.org/examples)
- [Threejs-fundamentals](https://threejsfundamentals.org)
- [Discover Threejs](https://discoverthreejs.com)
- [Do's and don'ts](https://discoverthreejs.com/tips-and-tricks) for performance and best practices
- [react-three-fiber alligator.io tutorial](https://alligator.io/react/react-with-threejs) by [@dghez\_](https://twitter.com/dghez_)

# API

- [api.md](api.md)
- [pitfalls.md](pitfalls.md)
- [recipes.md](recipes.md)

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
- [`react-three-gui`](https://github.com/ueno-llc/react-three-gui) &ndash; GUI/debug tools

# How to contribute

If you like this project, please consider helping out. All contributions are welcome as well as donations to [Opencollective](https://opencollective.com/react-three-fiber), or in crypto `BTC: 36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH`, `ETH: 0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682`.
