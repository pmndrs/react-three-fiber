# react-postprocessing

![npm](https://img.shields.io/npm/v/react-postprocessing?label=npm%20package&style=flat-square) ![npm](https://img.shields.io/npm/dt/react-postprocessing?style=flat-square) [![Discord Shield](https://discordapp.com/api/guilds/740090768164651008/widget.png?style=shield)](https://discord.gg/ZZjjNvJ)

`react-postprocessing` is a [postprocessing](https://vanruesc.github.io/postprocessing) wrapper for [react-three-fiber](https://github.com/react-spring/react-three-fiber). This is not (yet) meant for complex orchestration of effects, but can save you [hundreds of LOC](https://twitter.com/0xca0a/status/1289501594698960897) for a straight forward effects-chain.

```bash
npm install postprocessing react-postprocessing
```
<p align="center">
  <a href="https://m94xb.csb.app" target="_blank"><img width="274" src="./examples/src/demos/Bubbles/resources/screenshot.jpg" alt="Bubbles" /></a>
  <a href="https://5jgjz.csb.app" target="_blank"><img width="274" src="./examples/src/demos/TakeControl/resources/screenshot.jpg" alt="Take Control" /></a>
</p>
<p align="middle">
  <i>These demos are real, you can click them! They contain the full code, too. 📦</i>
</p>

#### Why postprocessing and not three/examples/jsm/postprocessing?

From [https://vanruesc.github.io/postprocessing](https://vanruesc.github.io/postprocessing/#performance)

> This library provides an EffectPass which automatically organizes and merges any given combination of effects. This minimizes the amount of render operations and makes it possible to combine many effects without the performance penalties of traditional pass chaining. Additionally, every effect can choose its own blend function.
>
> All fullscreen render operations also use a single triangle that fills the screen. Compared to using a quad, this approach harmonizes with modern GPU rasterization patterns and eliminates unnecessary fragment calculations along the screen diagonal. This is especially beneficial for GPGPU passes and effects that use complex fragment shaders.

Postprocessing also supports srgb-encoding out of the box, as well as WebGL2 MSAA (multi sample anti aliasing), which is react-postprocessing's default, you get high performance crisp results w/o jagged edges.

#### What does it look like?

Well, you can do pretty much anything, but here's an example combining a couple of effects ([live demo](https://codesandbox.io/s/vigorous-currying-3r6l2)).

<a href="https://codesandbox.io/s/vigorous-currying-3r6l2" target="_blank" rel="noopener">
<img src="https://i.imgur.com/mZucXdX.jpg" alt="Bubbles Demo" />
</a>

```jsx
import React from 'react'
import { EffectComposer, DepthOfField, Bloom, Noise, Vignette } from 'react-postprocessing'
import { Canvas } from 'react-three-fiber'

function App() {
  return (
    <Canvas>
      {/* Your regular scene contents go here, like always ... */}
      <EffectComposer>
        <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
        <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} />
        <Noise opacity={0.02} />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  )
}
```
    
#### Documentation

[react-postprocessing exports](https://github.com/react-spring/react-postprocessing/blob/master/api.md)

[postprocessing docs](https://vanruesc.github.io/postprocessing/public/docs/)
