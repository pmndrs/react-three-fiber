<h1>@react-three/fiber</h1>

[![Version](https://img.shields.io/npm/v/@react-three/fiber?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/fiber)
[![Downloads](https://img.shields.io/npm/dt/@react-three/fiber.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/fiber)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000)](https://discord.gg/ZZjjNvJ)
[![Open Collective](https://img.shields.io/opencollective/all/react-three-fiber?style=flat&colorA=000000&colorB=000000)](https://opencollective.com/react-three-fiber)
[![ETH](https://img.shields.io/badge/ETH-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/eth/address/0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682)
[![BTC](https://img.shields.io/badge/BTC-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/btc/address/36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH)

<a href="https://docs.pmnd.rs/react-three-fiber/getting-started/examples"><img src="docs/banner-r3f.jpg" /></a>

react-three-fiber is a <a href="https://reactjs.org/docs/codebase-overview.html#renderers">React renderer</a> for threejs.

Build your scene declaratively with re-usable, self-contained components that react to state, are readily interactive and can participate in React's ecosystem.

```bash
npm install three @types/three @react-three/fiber
```

> [!WARNING]  
> Three-fiber is a React renderer, it must pair with a major version of React, just like react-dom, react-native, etc. @react-three/fiber@8 pairs with react@18, @react-three/fiber@9 pairs with react@19.

---

#### Does it have limitations?

None. Everything that works in Threejs will work here without exception.

#### Is it slower than plain Threejs?

No. There is no overhead. Components render outside of React. It outperforms Threejs in scale due to React's scheduling abilities.

#### Can it keep up with frequent feature updates to Threejs?

Yes. It merely expresses Threejs in JSX, `<mesh />` dynamically turns into `new THREE.Mesh()`. If a new Threejs version adds, removes or changes features, it will be available to you instantly without depending on updates to this library.

### What does it look like?

<table>
  <tbody>
    <tr>
      <td>Let's make a re-usable component that has its own state, reacts to user-input and participates in the render-loop. (<a href="https://codesandbox.io/s/rrppl0y8l4?file=/src/App.js">live demo</a>).</td>
      <td>
        <a href="https://codesandbox.io/s/rrppl0y8l4">
          <img src="/docs/basic-app.gif" />
        </a>
      </td>
    </tr>
  </tbody>
</table>

```jsx
import { createRoot } from 'react-dom/client'
import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

function Box(props) {
  // This reference gives us direct access to the THREE.Mesh object
  const ref = useRef()
  // Hold state for hovered and clicked events
  const [hovered, hover] = useState(false)
  const [clicked, click] = useState(false)
  // Subscribe this component to the render-loop, rotate the mesh every frame
  useFrame((state, delta) => (ref.current.rotation.x += delta))
  // Return the view, these are regular Threejs elements expressed in JSX
  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

createRoot(document.getElementById('root')).render(
  <Canvas>
    <ambientLight intensity={Math.PI / 2} />
    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
    <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
    <Box position={[-1.2, 0, 0]} />
    <Box position={[1.2, 0, 0]} />
  </Canvas>,
)
```

<details>
  <summary>Show TypeScript example</summary>

```bash
npm install @types/three
```

```tsx
import * as THREE from 'three'
import { createRoot } from 'react-dom/client'
import React, { useRef, useState } from 'react'
import { Canvas, useFrame, ThreeElements } from '@react-three/fiber'

function Box(props: ThreeElements['mesh']) {
  const ref = useRef<THREE.Mesh>(null!)
  const [hovered, hover] = useState(false)
  const [clicked, click] = useState(false)
  useFrame((state, delta) => (ref.current.rotation.x += delta))
  return (
    <mesh
      {...props}
      ref={ref}
      scale={clicked ? 1.5 : 1}
      onClick={(event) => click(!clicked)}
      onPointerOver={(event) => hover(true)}
      onPointerOut={(event) => hover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'hotpink' : 'orange'} />
    </mesh>
  )
}

createRoot(document.getElementById('root') as HTMLElement).render(
  <Canvas>
    <ambientLight intensity={Math.PI / 2} />
    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
    <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
    <Box position={[-1.2, 0, 0]} />
    <Box position={[1.2, 0, 0]} />
  </Canvas>,
)
```

Live demo: https://codesandbox.io/s/icy-tree-brnsm?file=/src/App.tsx

</details>

<details>
  <summary>Show React Native example</summary>

This example relies on react 18 and uses `expo-cli`, but you can create a bare project with their template or with the `react-native` CLI.

```bash
# Install expo-cli, this will create our app
npm install expo-cli -g
# Create app and cd into it
expo init my-app
cd my-app
# Install dependencies
npm install three @react-three/fiber@beta react@rc
# Start
expo start
```

Some configuration may be required to tell the Metro bundler about your assets if you use `useLoader` or Drei abstractions like `useGLTF` and `useTexture`:

```js
// metro.config.js
module.exports = {
  resolver: {
    sourceExts: ['js', 'jsx', 'json', 'ts', 'tsx', 'cjs'],
    assetExts: ['glb', 'png', 'jpg'],
  },
}
```

```tsx
import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber/native'
function Box(props) {
  const mesh = useRef(null)
  const [hovered, setHover] = useState(false)
  const [active, setActive] = useState(false)
  useFrame((state, delta) => (mesh.current.rotation.x += delta))
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
export default function App() {
  return (
    <Canvas>
      <ambientLight intensity={Math.PI / 2} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} />
      <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} />
      <Box position={[-1.2, 0, 0]} />
      <Box position={[1.2, 0, 0]} />
    </Canvas>
  )
}
```

</details>

---

# Documentation, tutorials, examples

Visit [docs.pmnd.rs](https://docs.pmnd.rs/react-three-fiber)

# First steps

You need to be versed in both React and Threejs before rushing into this. If you are unsure about React consult the official [React docs](https://react.dev/learn), especially [the section about hooks](https://react.dev/reference/react). As for Threejs, make sure you at least glance over the following links:

1. Make sure you have a [basic grasp of Threejs](https://threejs.org/docs/index.html#manual/en/introduction/Creating-a-scene). Keep that site open.
2. When you know what a scene is, a camera, mesh, geometry, material, fork the [demo above](https://github.com/pmndrs/react-three-fiber#what-does-it-look-like).
3. [Look up](https://threejs.org/docs/index.html#api/en/objects/Mesh) the JSX elements that you see (mesh, ambientLight, etc), _all_ threejs exports are native to three-fiber.
4. Try changing some values, scroll through our [API](https://docs.pmnd.rs/react-three-fiber) to see what the various settings and hooks do.

Some helpful material:

- [Threejs-docs](https://threejs.org/docs) and [examples](https://threejs.org/examples)
- [Discover Threejs](https://discoverthreejs.com), especially the [Tips and Tricks](https://discoverthreejs.com/tips-and-tricks) chapter for best practices
- [Bruno Simons Threejs Journey](https://threejs-journey.com), arguably the best learning resource, now includes a full [R3F chapter](https://threejs-journey.com/lessons/what-are-react-and-react-three-fiber)

<a href="https://threejs-journey.com"><img src="docs/banner-journey.jpg" /></a>

# Ecosystem

There is a vibrant and extensive eco system around three-fiber, full of libraries, helpers and abstractions.

- [`@react-three/drei`](https://github.com/pmndrs/drei) &ndash; useful helpers, this is an eco system in itself
- [`@react-three/gltfjsx`](https://github.com/pmndrs/gltfjsx) &ndash; turns GLTFs into JSX components
- [`@react-three/postprocessing`](https://github.com/pmndrs/react-postprocessing) &ndash; post-processing effects
- [`@react-three/uikit`](https://github.com/pmndrs/uikit) &ndash; WebGL rendered UI components for three-fiber
- [`@react-three/test-renderer`](https://github.com/pmndrs/react-three-fiber/tree/master/packages/test-renderer) &ndash; for unit tests in node
- [`@react-three/offscreen`](https://github.com/pmndrs/react-three-offscreen) &ndash; offscreen/worker canvas for react-three-fiber
- [`@react-three/flex`](https://github.com/pmndrs/react-three-flex) &ndash; flexbox for react-three-fiber
- [`@react-three/xr`](https://github.com/pmndrs/react-xr) &ndash; VR/AR controllers and events
- [`@react-three/csg`](https://github.com/pmndrs/react-three-csg) &ndash; constructive solid geometry
- [`@react-three/rapier`](https://github.com/pmndrs/react-three-rapier) &ndash; 3D physics using Rapier
- [`@react-three/cannon`](https://github.com/pmndrs/use-cannon) &ndash; 3D physics using Cannon
- [`@react-three/p2`](https://github.com/pmndrs/use-p2) &ndash; 2D physics using P2
- [`@react-three/a11y`](https://github.com/pmndrs/react-three-a11y) &ndash; real a11y for your scene
- [`@react-three/gpu-pathtracer`](https://github.com/pmndrs/react-three-gpu-pathtracer) &ndash; realistic path tracing
- [`create-r3f-app next`](https://github.com/pmndrs/react-three-next) &ndash; nextjs starter
- [`lamina`](https://github.com/pmndrs/lamina) &ndash; layer based shader materials
- [`zustand`](https://github.com/pmndrs/zustand) &ndash; flux based state management
- [`jotai`](https://github.com/pmndrs/jotai) &ndash; atoms based state management
- [`valtio`](https://github.com/pmndrs/valtio) &ndash; proxy based state management
- [`react-spring`](https://github.com/pmndrs/react-spring) &ndash; a spring-physics-based animation library
- [`framer-motion-3d`](https://www.framer.com/docs/three-introduction/) &ndash; framer motion, a popular animation library
- [`use-gesture`](https://github.com/pmndrs/react-use-gesture) &ndash; mouse/touch gestures
- [`leva`](https://github.com/pmndrs/leva) &ndash; create GUI controls in seconds
- [`maath`](https://github.com/pmndrs/maath) &ndash; a kitchen sink for math helpers
- [`miniplex`](https://github.com/hmans/miniplex) &ndash; ECS (entity management system)
- [`composer-suite`](https://github.com/hmans/composer-suite) &ndash; composing shaders, particles, effects and game mechanics
- [`triplex`](https://triplex.dev/) &ndash; visual editor for react-three-fiber
- [`koestlich`](https://github.com/coconut-xr/koestlich) &ndash; UI component library for react-three-fiber

[Usage Trend of the @react-three Family](https://npm-compare.com/@react-three/a11y,@react-three/cannon,@react-three/csg,@react-three/drei,@react-three/flex,@react-three/gltfjsx,@react-three/gpu-pathtracer,@react-three/offscreen,@react-three/p2,@react-three/postprocessing,@react-three/rapier,@react-three/test-renderer,@react-three/uikit,@react-three/xr)

# Who is using Three-fiber

A small selection of companies and projects relying on three-fiber.

- [`vercel`](https://www.vercel.com) (design agency)
- [`basement`](https://basement.studio) (design agency)
- [`studio freight`](https://studiofreight.com) (design agency)
- [`14 islands`](https://www.14islands.com) (design agency)
- [`ueno`](https://dribbble.com/ueno) (design agency) — [video](https://twitter.com/0xca0a/status/1204373807408013312)
- [`flux.ai`](https://www.flux.ai) (PCB builder)
- [`colorful.app`](https://www.colorful.app) (modeller)
- [`bezi`](https://www.bezi.com) (modeller)
- [`readyplayer.me`](https://readyplayer.me) (avatar configurator)
- [`zillow`](https://www.zillow.com) (real estate)
- [`lumalabs.ai/genie`](https://lumalabs.ai/genie) (AI models)
- [`skybox.blockadelabs`](https://skybox.blockadelabs.com) (AI envmaps)
- [`3dconfig`](https://3dconfig.com) (floor planer)
- [`buerli.io`](https://buerli.io) (CAD)
- [`getencube`](https://www.getencube.com) (CAD)
- [`glowbuzzer`](https://www.glowbuzzer.com) (CAD) — [video](https://twitter.com/glowbuzzer/status/1678396014644940800)
- [`triplex`](https://triplex.dev) (editor) — [video](https://twitter.com/_douges/status/1708859381369221539)
- [`theatrejs`](https://www.theatrejs.com) (editor) — [video](https://twitter.com/0xca0a/status/1566838823170068480)

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
