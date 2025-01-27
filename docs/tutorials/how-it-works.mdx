---
title: How does it work?
description: This is an advanced guide on the inner workings of Fiber, if you are just getting started, take a
  look at our introduction!
nav: 18
---

React Three Fiber is a React <a href="https://reactjs.org/docs/codebase-overview.html#renderers">renderer</a> for **three.js**.

This means that each Fiber component will effectively create a new THREE object that will be added to a `scene`.
Understanding how this works is not necessarily needed to use Fiber, but it will better arm you to deal with anything that you might need in your projects, reading other people's Fiber code and even help you contribute.

Let's take a small React example:

```jsx
import { Canvas } from '@react-three/fiber'

function MyApp() {
  return (
    <Canvas>
      <group>
        <mesh>
          <meshNormalMaterial />
          <boxGeometry args={[2, 2, 2]} />
        </mesh>
      </group>
    </Canvas>
  )
}
```

In three.js, this is equivalent to:

```js
import * as THREE from 'three'

const scene = new THREE.Scene() // <Canvas>

const group = new THREE.Group() // <group>

const mesh = new THREE.Mesh() // <mesh />
const material = new THREE.MeshNormalMaterial() // <meshNormalMaterial />
const geometry = new THREE.BoxGeometry(2, 2, 2) // <boxGeometry />

mesh.material = material
mesh.geometry = geometry

group.add(mesh)
scene.add(group)
```

Our `Canvas` element will create a new scene, and Fiber will instantiate new objects for each component and correctly compose them together in a scene graph!

Additionally, Fiber will:

- Setup a new perspective camera at [0, 0, 0] and set it as default
- Setup a **render loop** with automatic render to screen
- Setup pointer events via raycasting on all meshes with `onPointer` props
- Setup tone mapping
- Automatically handle window resize

**Let's break this down!**

## Creating THREE objects

In three.js, we can create new object using the classic JS API:

```js
const myBox = new THREE.BoxGeometry(1, 2, 3)
```

Object creation is handled transparently by the Fiber renderer, the name of the constructor `BoxGeometry` is equivalent to the camel case component `<boxGeometry />`, while the constructor arguments - in our example `[1, 2, 3]` - are passed via the `args` prop:

```jsx
<boxGeometry args={[1, 2, 3]} />
```

> [!NOTE]
> Note that the object will be created only when first adding the component to the React tree!

## The `attach` props

Fiber always tries to correctly infer the relationship between components and their parents, for example:

```jsx
<group>
  <mesh />
</group>
```

Here, we always know that a group can only have children, so Fiber just calls the `add` method on the group:

```js
group.add(mesh)
```

For meshes and other three.js objects, rules can be different. Looking at the three.js documentation, we can see how a `THREE.Mesh` object is constructed using a `material` and a `geometry`.

With the `attach` prop, we can precisely tell the renderer what property to attach each component to:

```jsx
<mesh>
  <meshNormalMaterial attach="material" />
  <boxGeometry attach="geometry" />
</mesh>
```

This will _explicitly_ tell Fiber to render like this:

```js
mesh.material = new THREE.MeshNormalMaterial()
mesh.geometry = new THREE.BoxGeometry()
```

As you can see, the `attach` prop is telling Fiber to set the parent's `material` property to a reference to our `<meshNormalMaterial />` object.

Note that while we used geometry and material for this example, Fiber also infers the attach property from the
constructor name, so anything with `material` or `geometry` will automatically get attached to the correct property of
its parent.

## Props

With Fiber, you can pass any three.js property as a React property, and it will be assigned to the constructed object:

```jsx
<meshBasicMaterial color="red" />
```

is equivalent to:

```jsx
const material = new THREE.MeshBasicMaterial()
material.color = 'red'
```

Fiber will check the type of the property value and either:

- assign the new value directly
- if the value is an object with a `set` method, call that
- construct a new object if needed.
- convert between formats

```jsx
<mesh scale={[1, 2, 3]} />
```

is equivalent to:

```jsx
const mesh = new THREE.Mesh()
mesh.scale = new THREE.Vector3(1, 2, 3)

// on update, it will instead `set()` the vector
mesh.scale.set(3, 4, 5)
```

## Pointer Events

[Pointer Events](/api/events) are transparently handled by Fiber. On startup, it will create a [raycaster](https://threejs.org/docs/#api/en/core/Raycaster) for mouse picking.

Every object with `onPointer` props will be added to the array of objects checked every frame by the raycaster:

```jsx
<mesh onPointerDown={console.log}>...</mesh>
```

The ray's `origin` and `direction` are updated every time the mouse moves on the `<Canvas />` element or the window is resized.
Fiber also handles camera switching, meaning that the raycaster will always use the currently active camera.

When using the `raycast` prop, the object will instead be picked using a custom ray:

```jsx
import { useCamera } from '@react-three/drei'

return <mesh raycast={useCamera(anotherCamera)} />
```

## Render Loop

By default, Fiber will setup a render loop that renders the default `scene` from the default `camera` to a [WebGLRenderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer).

The loop is setup using [setAnimationLoop](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setAnimationLoop), which will execute its callback every time a new frame is renderable. This is what will happen every render:

1. All global before effects are executed
2. Clock delta is saved - implying all `useFrame` calls will share the same `delta`
3. `useFrame` callbacks are executed in order
4. `renderer.render(scene, camera)` is called, effectively rendering the scene to screen
5. All global after effects are executed
