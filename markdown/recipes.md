# Recipes

## Table of Contents

- [Animating with react-spring](#animating-with-react-spring)
- [Dealing with effects (hijacking main render-loop)](#dealing-with-effects-hijacking-main-render-loop)
- [Using your own camera rig](#using-your-own-camera-rig)
- [Heads-up display (rendering multiple scenes)](#heads-up-display-rendering-multiple-scenes)
- [Managing imperative code](#managing-imperative-code)
- [ShaderMaterials](#shadermaterials)
- [Re-parenting](#re-parenting)
- [Rendering only when needed](#rendering-only-when-needed)
- [Enabling VR](#enabling-vr)
- [Reducing bundle-size](#reducing-bundle-size)
- [Usage with React Native](#usage-with-react-native)
- [Safari support](#safari-support)

## Animating with react-spring

[react-spring](https://www.react-spring.io/) supports react-three-fiber out of the box:

```jsx
import { Canvas } from '@react-three/fiber'
import { a, useSpring } from '@react-spring/three'

function Box(props) {
  const [active, setActive] = useState(0)

  // create a common spring that will be used later to interpolate other values
  const { spring } = useSpring({
    spring: active,
    config: { mass: 5, tension: 400, friction: 50, precision: 0.0001 },
  })

  // interpolate values from common spring
  const scale = spring.to([0, 1], [1, 5])
  const rotation = spring.to([0, 1], [0, Math.PI])
  const color = spring.to([0, 1], ['#6246ea', '#e45858'])

  return (
    // using a from react-spring will animate our component
    <a.mesh rotation-y={rotation} scale-x={scale} scale-z={scale} onClick={() => setActive(Number(!active))}>
      <boxBufferGeometry args={[1, 1, 1]} />
      <a.meshStandardMaterial roughness={0.5} color={color} />
    </a.mesh>
  )
}
```

[CodeSandbox](https://8ckyf.csb.app/)

## Dealing with effects (hijacking main render-loop)

Managing effects can get quite complex normally. Drop the component below into a scene and you have a live effect. Remove it and everything is as it was without any re-configuration.

```jsx
import { extend, Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass'
extend({ EffectComposer, RenderPass, GlitchPass })

function Effects() {
  const { gl, scene, camera, size } = useThree()
  const composer = useRef()
  useEffect(() => void composer.current.setSize(size.width, size.height), [size])
  useFrame(() => composer.current.render(), 1)
  return (
    <effectComposer ref={composer} args={[gl]}>
      <renderPass attachArray="passes" args={[scene, camera]} />
      <glitchPass attachArray="passes" renderToScreen />
```

## Using your own camera rig

```jsx
function Camera(props) {
  const ref = useRef()
  const set = useThree(state => state.set)
  // Make the camera known to the system
  useEffect(() => void set({ camera: ref.current }), [])
  // Update it every frame
  useFrame(() => ref.current.updateMatrixWorld())
  return <perspectiveCamera ref={ref} {...props} />
}

<Canvas>
  <Camera position={[0, 0, 10]} />
```

## Heads-up display (rendering multiple scenes)

`useFrame` allows components to hook into the render-loop, or even to take it over entirely. That makes it possible for one component to render over the content of another. The order of these operations is established by the priority you give it, higher priority means it renders first.

```jsx
function Main() {
  const scene = useRef()
  const { camera } = useThree()
  useFrame(({ gl }) => void ((gl.autoClear = true), gl.render(scene.current, camera)), 100)
  return <scene ref={scene}>{/* ... */}</scene>
}

function HeadsUpDisplay() {
  const scene = useRef()
  const { camera } = useThree()
  useFrame(({ gl }) => void ((gl.autoClear = false), gl.clearDepth(), gl.render(scene.current, camera)), 10)
  return <scene ref={scene}>{/* ... */}</scene>
}

function App() {
  const camera = useRef()
  const { size, setDefaultCamera } = useThree()
  useEffect(() => void setDefaultCamera(camera.current), [])
  useFrame(() => camera.current.updateMatrixWorld())
  return (
    <>
      <perspectiveCamera
        ref={camera}
        aspect={size.width / size.height}
        radius={(size.width + size.height) / 4}
        onUpdate={self => self.updateProjectionMatrix()}
      />
      <Main />
      <HeadsUpDisplay />
```

## Managing imperative code

Stick imperative stuff into useMemo and write out everything else declaratively. This is how you can quickly form reactive, re-usable components that can be bound to a store, graphql, etc.

```jsx
function Extrusion({ start = [0, 0], paths, ...props }) {
  const shape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(...start)
    paths.forEach((path) => shape.bezierCurveTo(...path))
    return shape
  }, [start, paths])
  return (
    <mesh>
      <extrudeGeometry args={[shape, props]} />
      <meshPhongMaterial />
    </mesh>
  )
}

;<Extrusion
  start={[25, 25]}
  paths={[
    [25, 25, 20, 0, 0, 0],
    [30, 0, 30, 35, 30, 35],
    [30, 55, 10, 77, 25, 95],
  ]}
  bevelEnabled
  amount={8}
/>
```

## ShaderMaterials

```jsx
function CrossFade({ url1, url2, disp }) {
  const [texture1, texture2, dispTexture] = useLoader(THREE.TextureLoader, [url1, url2, disp])
  return (
    <mesh>
      <planeBufferGeometry  args={[1, 1]} />
      <shaderMaterial
        args={[CrossFadeShader]}
        uniforms-texture-value={texture1}
        uniforms-texture2-value={texture2}
        uniforms-disp-value={dispTexture}
        uniforms-dispFactor-value={0.5} />
    </mesh>
  )
```

## Re-parenting

We support [portals](https://reactjs.org/docs/portals.html). You can use them to teleport a piece of the view into another container. Click [here](https://codesandbox.io/s/three-fibre-useFrame-test-fojbq) for a small demo.

```jsx
import { createPortal } from '@react-three/fiber'

function Component() {
  // "target" can be a three object, like a group, etc
  return createPortal(<mesh />, target)
```

## Rendering only when needed

By default it renders like a game loop 60fps. Set `frameloop="demand"` to activate loop invalidation. Now it will render on demand when it detects prop changes.

```jsx
<Canvas frameloop="demand" ... />
```

Sometimes you want to render single frames manually, for instance when you're dealing with async stuff:

```jsx
const invalidate = useThree((state) => state.invalidate)
// request a frame for *this* root
const texture = useMemo(() => loader.load(url, invalidate), [url])
```

For cases where you want to want to invalidate all roots:

```jsx
import { invalidate } from '@react-three/fiber'
// request a frame for all roots
invalidate()
```

For camera controls here's [an example sandbox](https://codesandbox.io/s/r3f-invalidate-frameloop-fps-e0g9z) which uses:

```jsx
const Controls = () => {
  const { camera, gl, invalidate } = useThree()
  const ref = useRef()
  useFrame(() => ref.current.update())
  useEffect(() => void ref.current.addEventListener('change', invalidate), [])
  return <orbitControls ref={ref} args={[camera, gl.domElement]} />
}
```

## Enabling VR

React-Three-Fiber automatically switches rendering modes when you enter a WebXR session.

To request one, create a `VRButton` [as described in Three's docs](https://threejs.org/docs/index.html#manual/en/introduction/How-to-create-VR-content).

```jsx
import { VRButton } from 'three/examples/jsm/webxr/VRButton'
import { Canvas } from '@react-three/fiber'
;<Canvas vr onCreated={({ gl }) => document.body.appendChild(VRButton.createButton(gl))} />
```

## Reducing bundle-size

Threejs is quite heavy and tree-shaking doesn't yet yield the results you would hope for atm. But you can always create your own export-file and alias "three" towards it. This way you can reduce it to 80-50kb, or perhaps less, depending on what you need. Gist: https://gist.github.com/drcmda/974f84240a329fa8a9ce04bbdaffc04d

## Usage with React Native

You can use `@react-three/fiber` to build universal (native and web) apps with the same API, complete with loader support and pointer events.

> 💡 **Bootstrap**: `npx create-react-native-app -t with-react-three-fiber`

Be sure to use a physical iOS or Android device for testing because the simulator can have issues running graphics heavy apps.

### Setup with Expo

```bash
# Install the Expo CLI
npm i -g expo-cli

# Create a new project
expo init myapp
cd myapp

# Install packages
yarn add three @react-three/fiber

# Start the project
yarn start
```

## Safari support

Safari 12 does not support `ResizeObserver` out of the box, which causes errors in the `react-use-measure` dependency if you don't polyfill it. [@juggle/resize-observer](https://github.com/juggle/resize-observer) is the recommended `ResizeObserver` polyfill. It can be configured through the [`resize`](api.md#canvas) property on the `<Canvas>`:

```jsx
import { ResizeObserver } from '@juggle/resize-observer'
;<Canvas resize={{ polyfill: ResizeObserver }} />
```
