# Recipes

## Animating with react-spring

[react-spring](https://www.react-spring.io/) supports react-three-fiber out of the box:

```jsx
import { Canvas } from 'react-three-fiber'
// this example is using react-spring@9
import { useSpring } from '@react-spring/core'
import { a } from '@react-spring/three'

function Box(props) {
  const [active, setActive] = useState(0)

  // create a common spring that will be used later to interpolate other values
  const { spring } = useSpring({
    spring: active,
    config: { mass: 5, tension: 400, friction: 50, precision: 0.0001 }
  })

  // interpolate values from commong spring
  const scale = spring.to([0, 1], [1, 5])
  const rotation = spring.to([0, 1], [0, Math.PI])
  const color = spring.to([0, 1], ['#6246ea', '#e45858'])

  return (
    // using a from react-spring will animate our component
    <a.mesh rotation-y={rotation} scale-x={scale} scale-z={scale} onClick={() => setActive(Number(!active))}>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <a.meshStandardMaterial roughness={0.5} attach="material" color={color} />
    </a.mesh>
  )
}
```
[CodeSandbox](https://8ckyf.csb.app/)

## Dealing with effects (hijacking main render-loop)

Managing effects can get quite complex normally. Drop the component below into a scene and you have a live effect. Remove it and everything is as it was without any re-configuration.

```jsx
import { extend, Canvas, useFrame, useThree } from 'react-three-fiber'
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
  const { setDefaultCamera } = useThree()
  // Make the camera known to the system
  useEffect(() => void setDefaultCamera(ref.current), [])
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
function Extrusion({ start = [0,0], paths, ...props }) {
  const shape = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(...start)
    paths.forEach(path => shape.bezierCurveTo(...path))
    return shape
  }, [start, paths])

  return (
    <mesh>
      <extrudeGeometry attach="geometry" args={[shape, props]} />
      <meshPhongMaterial attach="material" />
    </mesh>
  )
}

<Extrusion
  start={[25, 25]}
  paths={[[25, 25, 20, 0, 0, 0], [30, 0, 30, 35,30,35], [30, 55, 10, 77, 25, 95]]}
  bevelEnabled amount={8} />
```

## ShaderMaterials

```jsx
function CrossFade({ url1, url2, disp }) {
  const [texture1, texture2, dispTexture] = useLoader(THREE.TextureLoader, [url1, url2, disp])
  
  return (
    <mesh>
      <planeBufferGeometry attach="geometry" args={[1, 1]} />
      <shaderMaterial
        attach="material"
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
import { createPortal } from 'react-three-fiber'

function Component() {
  // "target" can be a three object, like a group, etc
  return createPortal(<mesh />, target)
```

## Rendering only when needed

By default it renders like a game loop 60fps. Switch on `invalidateFrameloop` to activate loop invalidation. Now it will render on demand when it detects prop changes.

```jsx
<Canvas invalidateFrameloop ... />
```

Sometimes you want to render single frames manually, for instance when you're dealing with async stuff or camera controls:

```jsx
const { invalidate } = useThree()
const texture = useMemo(() => loader.load(url, invalidate), [url])
```

## Enabling VR

Supplying the `vr` flag enables Three's VR mode and switches the render-loop to gl.setAnimationLoop [as described in Three's docs](https://threejs.org/docs/index.html#manual/en/introduction/How-to-create-VR-content).

```jsx
import * as VR from '!exports-loader?WEBVR!three/examples/js/vr/WebVR'
import { Canvas } from 'react-three-fiber'

<Canvas vr onCreated={({ gl }) => document.body.appendChild(VR.createButton(gl))} />
```

## Switching the default renderer

If you want to exchange the default renderer you can. [Here's](https://codesandbox.io/s/yq90n32zmx) a small example. 

```jsx
import { render, unmountComponentAtNode } from 'react-three-fiber'

const renderer = new THREE.SVGRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const scene = new THREE.Scene()

render((
  <mesh>
    <sphereGeometry name="geometry" args={[1, 16, 16]} />
    <meshBasicMaterial name="material" />
  </mesh>
), scene)
```

## Reducing bundle-size

Threejs is quite heavy and tree-shaking doesn't yet yield the results you would hope for atm. But you can always create your own export-file and alias "three" towards it. This way you can reduce it to 80-50kb, or perhaps less, depending on what you need. Gist: https://gist.github.com/drcmda/974f84240a329fa8a9ce04bbdaffc04d


## Usage with React Native

You can use `react-three-fiber` to build universal (native and web) apps via Expo's WebGL package ([expo-gl](https://docs.expo.io/versions/latest/sdk/gl-view/)). 

> 💡 **Bootstrap**: `npx create-react-native-app -t with-react-three-fiber`

Be sure to use a physical iOS or Android device for testing because the simulator can have issues running graphics heavy apps.

### Manual setup
  
```bash
# Install the Expo CLI

npm i -g expo-cli

# Create a new project

expo init myapp
cd myapp

# Install packages

yarn add expo-gl expo-three three@latest react-three-fiber@beta

# Start the project

yarn start
```
