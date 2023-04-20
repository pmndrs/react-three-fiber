<h1>react-three-offscreen</h1>

[![Version](https://img.shields.io/npm/v/@react-three/offscreen?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/offscreen)
[![Downloads](https://img.shields.io/npm/dt/react-three-fiber.svg?style=flat&colorA=000000&colorB=000000)](https://npmjs.com/package/@react-three/offscreen)
[![Twitter](https://img.shields.io/twitter/follow/pmndrs?label=%40pmndrs&style=flat&colorA=000000&colorB=000000&logo=twitter&logoColor=000000)](https://twitter.com/pmndrs)
[![Discord](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=000000)](https://discord.gg/ZZjjNvJ)
[![Open Collective](https://img.shields.io/opencollective/all/react-three-fiber?style=flat&colorA=000000&colorB=000000)](https://opencollective.com/react-three-fiber)
[![ETH](https://img.shields.io/badge/ETH-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/eth/address/0x6E3f79Ea1d0dcedeb33D3fC6c34d2B1f156F2682)
[![BTC](https://img.shields.io/badge/BTC-f5f5f5?style=flat&colorA=000000&colorB=000000)](https://blockchain.com/btc/address/36fuguTPxGCNnYZSRdgdh6Ea94brCAjMbH)

react-three-fiber is a <a href="https://reactjs.org/docs/codebase-overview.html#renderers">React renderer</a> for threejs.

Build your scene declaratively with re-usable, self-contained components that react to state, are readily interactive and can participate in React's ecosystem.

```bash
npm install three @react-three/offscreen
```

```jsx
// App.jsx (main thread)
import { Canvas } from '@react-three/offscreen'

const worker = new Worker(new URL('./worker.js', import.meta.url))

export default function App() {
  return <Canvas shadows camera={{ position: [0, 5, 10], fov: 25 }} worker={worker} />
}
```

```jsx
// worker.js (worker thread)
import { render } from '@react-three/offscreen'

render(<Scene />)
```

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
