 <img width="270" src="https://i.imgur.com/kxEJWZx.gif" alt="react-xr - build experiences for xr vr ar" />

[![Version](https://img.shields.io/npm/v/react-xr?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/react-xr)
[![Downloads](https://img.shields.io/npm/dt/react-xr.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/react-xr)
[![Discord Shield](https://img.shields.io/discord/740090768164651008?style=flat&colorA=000000&colorB=000000&label=discord&logo=discord&logoColor=ffffff)](https://discord.gg/ZZjjNvJ)

React components and hooks for creating VR/AR applications with [react-three-fiber](https://github.com/react-spring/react-three-fiber)

```
npm add react-xr
```

<p align="center">
  <a href="https://codesandbox.io/s/react-xr-paddle-demo-v4uet"><img width="390" src="https://i.imgur.com/K71D3Ts.gif" /></a>
  <a href="https://codesandbox.io/s/react-xr-simple-demo-8i9ro"><img width="390" src="https://i.imgur.com/5yh7LKz.gif" /></a>
  <a href="https://codesandbox.io/s/react-xr-simple-ar-demo-8w8hm"><img height="221" src="https://i.imgur.com/yuNwPpn.gif" /></a>
  <a href="https://codesandbox.io/s/react-xr-hands-demo-gczkp"><img height="221" src="https://i.imgur.com/T7WKFCO.gif" /></a>
  <a href="https://codesandbox.io/s/react-xr-hands-physics-demo-tp97r"><img height="221" src="https://i.imgur.com/Cxes0Xj.gif" /></a>
</p>

<p align="middle">
  <i>These demos are real, you can click them! They contain the full code, too.</i>
</p>

## Getting started

Add `VRCanvas` or `ARCanvas` component (or replace your existing react-three-fiber `Canvas` component)

```jsx
import { VRCanvas } from 'react-xr'

function App() {
  return (
    <VRCanvas>
      {/* All your regular react-three-fiber elements go here */}
    </VRCanvas>
```

## Adding controllers to the scene

To get started with default controller models add `DefaultXRControllers` component. It will fetch appropriate input profile models. You can learn more [here](https://github.com/immersive-web/webxr-input-profiles/tree/master/packages/motion-controllers).

```jsx
import { VRCanvas, DefaultXRControllers } from 'react-xr'

<VRCanvas>
  <DefaultXRControllers />
```

You can access controllers' state (position, orientation, etc.) by using `useXR()` hook

```jsx
const { controllers } = useXR()
```

## API

### VRCanvas / ARCanvas

Extended react-three-fiber [Canvas](https://github.com/react-spring/react-three-fiber/blob/master/api.md#canvas) that includes:

- Button to start VR session
- Color management
- VR Mode
- react-xr context

For VR apps use `VRCanvas` and for AR apps use `ARCanvas`

```jsx
import { VRCanvas } from 'react-xr'

<VRCanvas>
  {/* All your regular react-three-fiber elements go here */}
```

### useXR

Hook that can only beused by components inside `XRCanvas` component.

```jsx
const { controllers } = useXR()
```

Controllers is an array of `XRController` objects

```jsx
interface XRController {
  grip: Group
  controller: Group
  inputSource: XRInputSource
  // ...
  // more in XRController.ts
}
```

`grip` and `controller` are ThreeJS groups that have the position and orientation of xr controllers. `grip` has an orientation that should be used to render virtual objects such that they appear to be held in the user’s hand and `controller` has an orientation of the preferred pointing ray.

<img width="200" height="200" src="https://i.imgur.com/3stLjfR.jpg" />

`inputSource` is the WebXR input source [(MDN)](https://developer.mozilla.org/en-US/docs/Web/API/XRInputSource). Note that it will not be available before controller is connected.

### useXREvent

Every controller emits following events: select, selectstart, selectend, squeeze, squeezestart, squeezeend.

To listen to those events use `useXREvent` hook:

```jsx
const onSqueeze = useCallback(() => console.log('Squeezed'), [])
useXREvent('squeeze', onSqueeze)
```

it supports optional third parameter with options

```jsx
const onSqueeze = useCallback(() => console.log('Left controller squeeze'), [])
useXREvent('squeeze', onSqueeze, { handedness: 'left' })
```

### useControllers

Use this hook to get an instance of the controller

```jsx
const leftController = useController('left')
```

### `<Hands>`

Add hands model for hand-tracking. Currently only works on Oculus Quest with #webxr-hands experimental flag enabled

```jsx
<VRCanvas>
  <Hands />
```

### Interactions

`react-xr` comes with built-in high level interaction components.

#### `<Hover>`

`Hover` component will allow you for detecting when ray shot from the controllers is pointing at the given mesh.

```jsx
<Hover onChange={(value) => console.log(value ? 'hovered' : 'blurred')}>
  <mesh />
</Hover>
```

#### `<Select>`

`Select` can be used when you need to select some mesh. Component will trigger `onSelect` function when controller is pointing at the given mesh and `select` event was fired.

```jsx
<Select onSelect={() => console.log('mesh has been selected')}>
  <mesh />
</Select>
```

## Getting the VR Camera (HMD) Location

To get the position of the VR camera, use three's WebXRManager instance.

```jsx
const { camera } = useThree()
const cam = gl.xr.isPresenting ? gl.xr.getCamera(camera) : camera
```

## Parent VR HMD and Controllers to another object

If you want to attach the user to an object so it can be moved around, just parent the VR camera and controllers to an object3D.

```jsx
const mesh = useRef()
const { gl, camera } = useThree()

useEffect(() => {
  const cam = gl.xr.isPresenting ? gl.xr.getCamera(camera) : camera
  mesh.current.add(cam)
  return () => mesh.current.remove(cam)
}, [gl.xr.isPresenting, gl.xr, camera, mesh])

// bundle add the controllers to the same object as the camera so it all stays together.
const { controllers } = useXR()
useEffect(() => {
  if (controllers.length > 0) controllers.forEach((c) => mesh.current.add(c.grip))
  return () => controllers.forEach((c) => mesh.current.remove(c.grip))
}, [controllers, mesh])
```
