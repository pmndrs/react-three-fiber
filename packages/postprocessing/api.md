# Effects

Here's a list of all wrapped effects with demos, example usage (with default props) and reference to postprocessing docs.

- [`<SSAO />`](#ssao---) [![](https://img.shields.io/badge/-docs-green)][ssao-docs]
- [`<Glitch />`](#glitch---) [![](https://img.shields.io/badge/-docs-green)](Glitch-Docs)
- [`<GodRays />`](#godrays---)[![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/GodRaysEffect.js~GodRaysEffect.html)
- [`<Noise />`](#noise---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-noise-demo-6cxje)
  [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/NoiseEffect.js~NoiseEffect.html)
- [`<Bloom />`](#bloom---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-showcase-demo-dr9rj) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/BloomEffect.js~BloomEffect.html)
- [`<Outline />`](#outline---) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/OutlineEffect.js~OutlineEffect.html)
- [`<SelectiveBloom />`](#selectivebloom---) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SelectiveBloomEffect.js~SelectiveBloomEffect.html)
- [`<Vignette />`](#vignette---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-vignette-and-sepia-demo-vt0cd) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/VignetteEffect.js~VignetteEffect.html)
- [`<Sepia />`](#sepia---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-vignette-and-sepia-demo-vt0cd) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SepiaEffect.js~SepiaEffect.html)
- [`<DotScreen />`](#dotscreen---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-dotscreen-demo-vthef) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/DotScreenEffect.js~DotScreenEffect.html)
- [`<Pixelation />`](#pixelation---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-pixelation-demo-q4x1h) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/PixelationEffect.js~PixelationEffect.html)
- [`<HueSaturation />`](#huesaturation---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-huesaturation-demo-vqis3) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SaturationEffect.js~SaturationEffect.html)
- [`<BrightnessContrast />`](#brightnesscontrast---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-brightnesscontrast-demo-lhl6z) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/BrightnessContrastEffect.js~BrightnessContrastEffect.html)
- [`<ToneMapping />`](#tonemapping---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-tonemapping-demo-ljgcq) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/ToneMappingEffect.js~ToneMappingEffect.html)
- [`<Scanline />`](#scanline---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-scanline-demo-luo42) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/ScanlineEffect.js~ScanlineEffect.html)
- [`<ChromaticAberration />`](#chromaticaberration---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-chromaticaberration-demo-63379) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/ChromaticAberrationEffect.js~ChromaticAberrationEffect.html)
- [`<ColorAverage />`](#coloraverage---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-coloraverage-demo-yj4gx) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/ColorAverageEffect.js~ColorAverageEffect.html)
- [`<Grid />`](#grid---) [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-grid-demo-fkzmp) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/GridEffect.js~GridEffect.html)
- [`<SMAA />`](#smaa---) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SMAAEffect.js~SMAAEffect.html)

#### `<SSAO />` [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SSAOEffect.js~SSAOEffect.html)

```jsx
import { SSAO } from 'react-postprocessing'
import { BlendFunction } from 'postprocessing'

return (
  <SSAO
    blendFunction={BlendFunction.MULTIPLY} // blend mode
    samples={30} // amount of samples per pixel (shouldn't be a multiple of the ring count)
    rings={4} // amount of rings in the occlusion sampling pattern
    distanceThreshold={1.0} // global distance threshold at which the occlusion effect starts to fade out. min: 0, max: 1
    distanceFalloff={0.0} // distance falloff. min: 0, max: 1
    rangeThreshold={0.5} // local occlusion range threshold at which the occlusion starts to fade out. min: 0, max: 1
    rangeFalloff={0.1} // occlusion range falloff. min: 0, max: 1
    luminanceInfluence={0.9} // how much the luminance of the scene influences the ambient occlusion
    radius={20} // occlusion sampling radius
    scale={0.5} // scale of the ambient occlusion
    bias={0.5} // occlusion bias
  />
)
```

#### `<Glitch />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-glitchnoise-demo-wd4wx) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/GlitchEffect.js~GlitchEffect.html)

```jsx
import { Glitch } from 'react-postprocessing'
import { GlitchMode } from 'postprocessing'

return (
  <Glitch
    delay={[1.5, 3.5]} // min and max glitch delay
    duration={[0.6, 1.0]} // min and max glitch duration
    strength={[0.3, 1.0]} // min and max glitch strength
    mode={GlitchMode.SPORADIC} // glitch mode
    active // turn on/off the effect (switches between "mode" prop and GlitchMode.DISABLED)
    ratio={0.85} // Threshold for strong glitches, 0 - no weak glitches, 1 - no strong glitches.
  />
)
```

#### [`<GodRays />`](#godrays---) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/GodRaysEffect.js~GodRaysEffect.html)

The GodRays effect requires a mesh that will be used as an origin point for the rays. Refer to [this example](https://github.com/react-spring/react-postprocessing/tree/master/examples/take-control) for more details.

```jsx
import { GodRays } from 'react-postprocessing'

return (
 <GodRays
   sun={sunRef}
   blendFunction={BlendFunction.Screen} // The blend function of this effect.
   samples={60} // The number of samples per pixel.
   density={0.96} // The density of the light rays.
   decay={0.9} // An illumination decay factor.
   weight={0.4} // A light ray weight factor.
   exposure={0.6} // A constant attenuation coefficient.
   clampMax={1} // An upper bound for the saturation of the overall effect.
   width={Resizer.AUTO_SIZE} // Render width.
   height={Resizer.AUTO_SIZE} // Render height.
   kernelSize={KernelSize.SMALL} // The blur kernel size. Has no effect if blur is disabled.
   blur={true} // Whether the god rays should be blurred to reduce artifacts.
  />

)
```

#### `<Noise />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-glitchnoise-demo-wd4wx) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/NoiseEffect.js~NoiseEffect.html)

```jsx
import { Noise } from 'react-postprocessing'
import { BlendFunction } from 'postprocessing'

return (
  <Noise
    premultiply // enables or disables noise premultiplication
    blendFunction={BlendFunction.ADD} // blend mode
  />
)
```

#### `<Bloom />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-ssao-smaa-and-bloom-demo-r9ujf) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/BloomEffect.js~BloomEffect.html)

```jsx
import { Bloom } from 'react-postprocessing'
import { BlurPass, Resizer, KernelSize } from 'postprocessing'

return (
  <Bloom
    intensity={1.0} // The bloom intensity.
    blurPass={undefined} // A blur pass.
    width={Resizer.AUTO_SIZE} // render width
    height={Resizer.AUTO_SIZE} // render height
    kernelSize={KernelSize.LARGE} // blur kernel size
    luminanceThreshold={0.9} // luminance threshold. Raise this value to mask out darker elements in the scene.
    luminanceSmoothing={0.025} // smoothness of the luminance threshold. Range is [0, 1]
  />
)
```

#### `<Outline />` [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/OutlineEffect.js~OutlineEffect.html)

```jsx
import { Outline } from 'react-postprocessing'
import { BlendFunction, Resizer, KernelSize } from 'postprocessing'

return (
  <Outline
    selection={[meshRef1, meshRef2]} // selection of objects that wiill be outlined
    selectionLayer={10} // selection layer
    blendFunction={BlendFunction.SCREEN} // set this to BlendFunction.ALPHA for dark outlines
    patternTexture={null} // a pattern texture
    edgeStrength={2.5} // the edge strength
    pulseSpeed={0.0} // a pulse speed. A value of zero disables the pulse effect
    visibleEdgeColor={0xffffff} // the color of visible edges
    hiddenEdgeColor={0x22090a} // the color of hidden edges
    width={Resizer.AUTO_SIZE} // render width
    height={Resizer.AUTO_SIZE} // render height
    kernelSize={KernelSize.LARGE} // blur kernel size
    blur={false} // whether the outline should be blurred
    xRay={true} // indicates whether X-Ray outlines are enabled
  />
)
```

#### `<SelectiveBloom />` [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SelectiveBloomEffect.js~SelectiveBloomEffect.html)

```jsx
import { Bloom } from 'react-postprocessing'
import { BlurPass, Resizer, KernelSize } from 'postprocessing'

return (
  <SelectiveBloom
    lights={[lightRef1, lightRef2]} // ⚠️ REQUIRED! all relevant lights
    selection={[meshRef1, meshRef2]} // selection of objects that will have bloom effect
    selectionLayer={10} // selection layer
    intensity={1.0} // The bloom intensity.
    blurPass={undefined} // A blur pass.
    width={Resizer.AUTO_SIZE} // render width
    height={Resizer.AUTO_SIZE} // render height
    kernelSize={KernelSize.LARGE} // blur kernel size
    luminanceThreshold={0.9} // luminance threshold. Raise this value to mask out darker elements in the scene.
    luminanceSmoothing={0.025} // smoothness of the luminance threshold. Range is [0, 1]
  />
)
```

#### `<Vignette />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-vignette-and-sepia-demo-vt0cd) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/VignetteEffect.js~VignetteEffect.html)

```jsx
import { Vignette } from 'react-postprocessing'
import { BlendFunction } from 'postprocessing'

return (
  <Vignette
    offset={0.5} // vignette offset
    darkness={0.5} // vignette darkness
    eskill={false} // Eskil's vignette technique
    blendFunction={BlendFunction.NORMAL} // blend mode
  />
)
```

#### `<Sepia />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-vignette-and-sepia-demo-vt0cd) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SepiaEffect.js~SepiaEffect.html)

```jsx
import { Sepia } from 'react-postprocessing'

return (
  <Sepia
    intensity={1.0} // sepia intensity
    blendFunction={BlendFunction.NORMAL} // blend mode
  />
)
```

#### `<DotScreen />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-dotscreen-demo-vthef) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/DotScreenEffect.js~DotScreenEffect.html)

```jsx
import { DotScreen } from 'react-postprocessing'
import { BlendFunction } from 'postprocessing'

return (
  <DotScreen
    blendFunction={BlendFunction.NORMAL} // blend mode
    angle={Math.PI * 0.5} // angle of the dot pattern
    scale={1.0} // scale of the dot pattern
  />
)
```

#### `<Pixelation />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-pixelation-demo-q4x1h) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/PixelationEffect.js~PixelationEffect.html)

```jsx
import { Pixelation } from 'react-postprocessing'

return (
  <Pixelation
    granularity={5} // pixel granularity
  />
)
```

#### `<HueSaturation />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-huesaturation-demo-vqis3) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SaturationEffect.js~SaturationEffect.html)

```jsx
import { HueSaturation } from 'react-postprocessing'
import { BlendFunction } from 'postprocessing'

return (
  <HueSaturation
    blendFunction={BlendFunction.NORMAL} // blend mode
    hue={0} // hue in radians
    saturation={0} // saturation in radians
  />
)
```

#### `<BrightnessContrast />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-brightnesscontrast-demo-lhl6z) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/BrightnessContrastEffect.js~BrightnessContrastEffect.html)

```jsx
import { BrightnessContrast } from 'postprocessing'

return (
  <BrightnessContrast
    brightness={0} // brightness. min: -1, max: 1
    contrast={0} // contrast: min -1, max: 1
  />
)
```

#### `<ToneMapping />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-tonemapping-demo-ljgcq) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/ToneMappingEffect.js~ToneMappingEffect.html)

```jsx
import { ToneMapping } from 'react-postprocessing'
import { BlendFunction } from 'postprocessing'

return (
  <ToneMapping
    blendFunction={BlendFunction.NORMAL} // blend mode
    adaptive={true} // toggle adaptive luminance map usage
    resolution={256} // texture resolution of the luminance map
    middleGrey={0.6} // middle grey factor
    maxLuminance={16.0} // maximum luminance
    averageLuminance={1.0} // average luminance
    adaptationRate={1.0} // luminance adaptation rate
  />
)
```

#### `<Scanline />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-scanline-demo-luo42) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/ScanlineEffect.js~ScanlineEffect.html)

```jsx
import { Scanline } from 'react-postprocessing'
import { BlendFunction } from 'postprocessing'

return (
  <Scanline
    blendFunction={BlendFunction.OVERLAY} // blend mode
    density={1.25} // scanline density
  />
)
```

#### `<ChromaticAberration />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-chromaticaberration-demo-63379) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/ChromaticAberrationEffect.js~ChromaticAberrationEffect.html)

```jsx
import { ChromaticAberration } from 'react-postprocessing'
import { BlendFunction } from 'postprocessing'

return (
  <ChromaticAberration
    blendFunction={BlendFunction.NORMAL} // blend mode
    offset={[0.02, 0.002]} // color offset
  />
)
```

#### `<ColorAverage />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-coloraverage-demo-yj4gx) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/ColorAverageEffect.js~ColorAverageEffect.html)

```jsx
import { ColorAverage } from 'react-postprocessing'
import { BlendFunction } from 'postprocessing'

return (
  <ColorAverage
    blendFunction={BlendFunction.NORMAL} // blend mode
  />
)
```

#### `<Grid />` [![](https://img.shields.io/badge/-codesandbox-blue)](https://codesandbox.io/s/react-postprocessing-grid-demo-fkzmp) [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/GridEffect.js~GridEffect.html)

```jsx
import { Grid } from 'react-postprocessing'
import { BlendFunction } from 'postprocessing'

return (
  <Grid
    blendFunction={BlendFunction.OVERLAY} // blend mode
    scale={1.0} // grid pattern scale
    lineWidth={0.0} // grid pattern line width
    size={{ width, height }} // overrides the default pass width and height
  />
)
```

[Showcase-Sandbox]: [https://codesandbox.io/s/react-postprocessing-showcase-demo-dr9rj]

[SSAO-Docs]: [https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SSAOEffect.js~SSAOEffect.html]

[Glitch-Docs]: [https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/GlitchEffect.js~GlitchEffect.html]


#### `<SMAA />` [![](https://img.shields.io/badge/-docs-green)](https://vanruesc.github.io/postprocessing/public/docs/class/src/effects/SMAAEffect.js~SMAAEffect.html)

By default react-postprocessing uses webgl2 multisampling (MSAA) for native AA. In some effects this can [result in artefacts](https://github.com/vanruesc/postprocessing/wiki/Antialiasing#multisample-antialiasing). Should you either want to work with webgl1 exclusively, or you get artefacts, then you can switch MSAA off and use SMAA. This effect is async and relies on suspense!

```jsx
import React, { Suspense } from 'react'
import { EffectComposer, SMAA } from 'react-postprocessing'

return (
  <Suspense fallback={null}>
    <EffectComposer multisamping={0}>
      <SMAA
        edgeDetection={0.1} // accuracy (default = 0.1)
      />
    </EffectComposer>
  </Suspense>
)
```

# Custom effects

If you plan to use custom effects, make sure to expose the effect itself as a primitive!

```jsx
import React, { forwardRef, useMemo } from 'react'
import { PixelationEffect } from 'postprocessing'

export const Pixelation = forwardRef(({ granularity = 5 }, ref) => {
  const effect = useMemo(() => new PixelationEffect(granularity), [granularity])
  return <primitive ref={ref} object={effect} dispose={null} />
})
```
