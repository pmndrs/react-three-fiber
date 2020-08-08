<h1>react-three-fiber</h1>

<a href="https://travis-ci.org/react-spring/react-three-fiber"><img src="https://travis-ci.org/react-spring/react-three-fiber.svg?branch=master" alt="Build Status"></a>
<a href="https://badge.fury.io/js/react-three-fiber"><img src="https://badge.fury.io/js/react-three-fiber.svg" alt="npm version"></a>
<img src="https://img.shields.io/npm/dt/react-three-fiber.svg" alt="npm download">
[![Discord Shield](https://discordapp.com/api/guilds/740090768164651008/widget.png?style=shield)](https://discord.gg/ZZjjNvJ)

react-three-fiber is a React <a href="https://reactjs.org/docs/codebase-overview.html#renderers">renderer</a> for Threejs on the web and react-native.

<br />

    npm install three react-three-fiber

<br />
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

Building dynamic scene graphs declaratively with re-usable components makes dealing with Threejs easier and brings order and sanity to your codebase. These components react to state changes, are interactive out of the box and can tap into React's infinite ecosystem.

#### Does it have limitations?

None. Everything that works in Threejs will work here. In contrast to "bindings" where a library ships/maintains dozens of wrapper components, it just renders JSX to Threejs dynamically: `<mesh />` simply is another expression for `new THREE.Mesh()`. It does not know or target a specific Threejs version nor does it need updates for modified, added or removed upstream features.

#### Is it slower than raw Threejs?

No. Rendering performance is up to Threejs and the GPU. Components participate in the renderloop outside of React, without any additional overhead. React is otherwise very efficient in building and managing component-trees, it could potentially outperform manual/imperative apps at scale.

#### What does it look like?

<table>
  <tr>
    <td>Let's make a re-usable component that has its own state, reacts to user-input and participates in the render-loop. (<a href="https://codesandbox.io/s/rrppl0y8l4">live demo</a>).</td>
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
      onPointerOut={(e) => setHover(false)}>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <meshStandardMaterial attach="material" color={hovered ? 'hotpink' : 'orange'} />
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

1. Before you start, make sure you have a [basic grasp of Threejs](https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene).
2. When you know what a scene is, a camera, mesh, geometry and material, more or less, fork the [demo sandbox on the frontpage](https://github.com/react-spring/react-three-fiber#what-does-it-look-like), try out some of the things you learn here.
3. Don't break your head, three-fiber is Threejs, it does not introduce new rules or assumptions. If you see a snippet somewhere and you don't know how to make it declarative yet, use it 1:1 as it is.

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

- 🌭 [drei](https://github.com/react-spring/drei), useful helpers for react-three-fiber
- 💣 [use-cannon](https://github.com/react-spring/use-cannon), physics based hooks
- 🤳 [react-xr](https://github.com/react-spring/react-xr), VR/AR controllers and events
- 📬 [react-postprocessing](https://github.com/react-spring/react-postprocessing), post-processing effects
- 🎮 [gltfjsx](https://github.com/react-spring/gltfjsx), turns GLTFs into JSX components
- 🐻 [zustand](https://github.com/react-spring/zustand), state management
- ✌️ [react-spring](https://github.com/react-spring/react-spring), a spring-physics-based animation library
- 👇 [react-use-gesture](https://github.com/react-spring/react-use-gesture), mouse/touch gestures
- 🧪 [react-three-gui](https://github.com/ueno-llc/react-three-gui), GUI/debug tools

# News, updates, community

- [@0xca0a](https://twitter.com/0xca0a)'s twitter
- [github discussions](https://github.com/react-spring/react-three-fiber/discussions)

# How to contribute

If you like this project, please consider helping out. All contributions are welcome as well as donations to [Opencollective](https://opencollective.com/react-three-fiber), or in crypto `BTC: 36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH`, `ETH: 0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682`.

#### Sponsors

<a href="https://opencollective.com/react-three-fiber/sponsor/0/website" target="_blank">
  <img src="https://opencollective.com/react-three-fiber/sponsor/0/avatar.svg"/>
</a>
<a href="https://opencollective.com/react-three-fiber/sponsor/1/website" target="_blank">
  <img src="https://opencollective.com/react-three-fiber/sponsor/1/avatar.svg"/>
</a>

#### Backers

Thank you to all our backers! 🙏

<a href="https://opencollective.com/react-three-fiber#backers" target="_blank">
  <img src="https://opencollective.com/react-three-fiber/backers.svg?width=890"/>
</a>

##### Contributors

This project exists thanks to all the people who contribute.

<a href="https://github.com/react-spring/react-three-fiber/graphs/contributors">
  <img src="https://opencollective.com/react-three-fiber/contributors.svg?width=890" />
</a>
