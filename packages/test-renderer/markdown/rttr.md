# React Three Test Renderer API

## Table of Contents

- [`create()`](#create)
  - [`scene`](#create-scene)
  - [`getInstance()`](#create-getinstance)
  - [`toTree()`](#create-totree)
  - [`toGraph()`](#create-tograph)
  - [`fireEvent()`](#create-fireevent)
  - [`advanceFrames()`](#create-advanceframes)
  - [`update()`](#create-update)
  - [`unmount()`](#create-unmount)
- [`act()`](#act)

---

## `create()` 🧪 <a id="create"></a>

```tsx
const renderer = ReactThreeTestRenderer.create(element, options)
```

Create a ReactThreeTestRenderer instance with a passed `three` element e.g. `<mesh />`. By default, it won't create an actual `THREE.WebGLRenderer` and there will be no loop. But it will still render the complete scene graph. Returns the properties below.

#### CreateOptions

```ts
// RenderProps is from react-three-fiber
interface CreateOptions extends RenderProps<HTMLCanvasElement> {
  width?: number // width of canvas
  height?: number // height of canvas
}
```

### `scene` <a id="create-scene"></a>

```tsx
renderer.scene
```

Returns the root “react three test instance” object that is useful for making assertions. You can use it to find other “test instances” deeper below.

### `getInstance()` <a id="create-getinstance"></a>

```tsx
renderer.getInstance()
```

Return the instance corresponding to the root three element, if available. This will not work if the root element is a function component because they don’t have instances.

### `toTree()` <a id="create-totree"></a>

```tsx
renderer.toTree()
```

Returns an object representing the rendered tree similar to [`react-test-renderer`](https://reactjs.org/docs/test-renderer.html#overview). This will include all elements written as react components.

### `toGraph()` <a id="create-tograph"></a>

```tsx
renderer.toGraph()
```

Returns an object representing the [`scene graph`](https://threejs.org/manual/#en/scenegraph). This will not include all elements such as ones that use `attach`.

### `fireEvent()` <a id="create-fireevent"></a>

```tsx
renderer.fireEvent(testInstance, eventName, mockEventData)
```

Native method to fire events on the specific part of the rendererd tree through passing an element within the tree and an event name. The third argument is appended to the [`MockSyntheticEvent`](#create-fireevent-mocksyntheticevent) passed to the event handler.

Event names follow camelCase convention (e.g. `pointerUp`), or you can pass event handler name instead (e.g. `onPointerUp`).

#### `MockSyntheticEvent` <a id="create-fireevent-mocksyntheticevent"></a>

```ts
type MockSyntheticEvent = {
  camera: Camera // the default camera of the rendered scene
  stopPropagation: () => void
  target: ReactThreeTestInstance
  currentTarget: ReactThreeTestInstance
  sourceEvent: MockEventData
  ...mockEventData
}
```

### `advanceFrames()` <a id="create-advanceframes"></a>

```tsx
renderer.advanceFrames(frames, delta)
```

Native method to advance the frames (therefore running subscribers to the GL Render loop such as `useFrame`). Requires an amount of frames to advance by & a parameter of delta to pass to the subscribers creating a more controlled testing environment.

### `update()` <a id="create-update"></a>

```tsx
renderer.update(element)
```

Rerender the tree with the new root element. This simulates a react update at the update, thus updating the children below. If the new element has the same type and key as the previous element, the tree will be updated.

### `unmount()` <a id="create-unmount"></a>

```tsx
renderer.unmount()
```

Unmount the tree, triggering the appropriate lifecycle events.

---

## `act()` ⚛️ <a id="act"></a>

```tsx
ReactThreeTestRenderer.act(callback)
```

Similar to the [`act()` in `react-test-renderer`](https://reactjs.org/docs/test-renderer.html#testrendereract). `ReactThreeTestRenderer.act` prepares a component for assertions. Unlike `react-test-renderer` you do not have to wrap calls to `ReactThreeTestRenderer.create` and `renderer.update`.

#### Act example (using jest)

```tsx
import ReactThreeTestRenderer from 'react-three-test-renderer'

const Mesh = () => {
  const meshRef = React.useRef()
  useFrame((_, delta) => {
    meshRef.current.rotation.x += delta
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2]} />
      <meshBasicMaterial />
    </mesh>
  )
}

const renderer = await ReactThreeTestRenderer.create(<Mesh />)

expect(renderer.scene.children[0].instance.rotation.x).toEqual(0)

await ReactThreeTestRenderer.act(async () => {
  await renderer.advanceFrames(2, 1)
})

expect(renderer.scene.children[0].instance.rotation.x).toEqual(2)
```
