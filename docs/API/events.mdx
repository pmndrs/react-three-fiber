---
title: Events
description: All the events you can hook up to
nav: 7
---

`three.js` objects that implement their own `raycast` method (meshes, lines, etc) can be interacted with by declaring events on them. We support pointer events, clicks and wheel-scroll. Events contain the browser event as well as the `three.js` event data (object, point, distance, etc). You may want to [polyfill](https://github.com/jquery/PEP) them, if that's a concern.

Additionally, there's a special `onUpdate` that is called every time the object gets fresh props, which is good for things like `self => (self.verticesNeedUpdate = true)`.

Also notice the `onPointerMissed` on the canvas element, which fires on clicks that haven't hit _any_ meshes.

```jsx
<mesh
  onClick={(e) => console.log('click')}
  onContextMenu={(e) => console.log('context menu')}
  onDoubleClick={(e) => console.log('double click')}
  onWheel={(e) => console.log('wheel spins')}
  onPointerUp={(e) => console.log('up')}
  onPointerDown={(e) => console.log('down')}
  onPointerOver={(e) => console.log('over')}
  onPointerOut={(e) => console.log('out')}
  onPointerEnter={(e) => console.log('enter')} // see note 1
  onPointerLeave={(e) => console.log('leave')} // see note 1
  onPointerMove={(e) => console.log('move')}
  onPointerMissed={() => console.log('missed')}
  onUpdate={(self) => console.log('props have been updated')}
/>
```

### Event data

```jsx
({
  ...DomEvent                   // All the original event data
  ...Intersection                 // All of Three's intersection data - see note 2
  intersections: Intersection[]    // The first intersection of each intersected object
  object: Object3D              // The object that was actually hit
  eventObject: Object3D         // The object that registered the event
  unprojectedPoint: Vector3     // Camera-unprojected point
  ray: Ray                      // The ray that was used to strike the object
  camera: Camera                // The camera that was used in the raycaster
  sourceEvent: DomEvent         // A reference to the host event
  delta: number                 // Distance between mouse down and mouse up event in pixels
}) => ...
```

### How the event-system works, bubbling and capture

> [!NOTE]
> - `pointerenter` and `pointerleave` events work exactly the same as pointerover and pointerout.
> - `pointerenter` and `pointerleave` semantics are not implemented.

> [!NOTE]
> Some events (such as `pointerout`) happen when there is no intersection between `eventObject` and
the ray. When this happens, the event will contain intersection data from a previous event with
this object.

### Event propagation (bubbling)

Propagation works a bit differently to the DOM because objects can occlude each other in 3D. The `intersections` array in the event includes all objects intersecting the ray, not just the nearest. Only the first intersection with each object is included.
The event is first delivered to the object nearest the camera, and then bubbles up through its ancestors like in the DOM. After that, it is delivered to the next nearest object, and then its ancestors, and so on. This means objects are transparent to pointer events by default, even if the object handles the event.

`event.stopPropagation()` doesn't just stop this event from bubbling up, it also stops it from being delivered to farther objects (objects behind this one). All other objects, nearer or farther, no longer count as being hit while the pointer is over this object. If they were previously delivered pointerover events, they will immediately be delivered pointerout events. If you want an object to block pointer events from objects behind it, it needs to have an event handler as follows:

```jsx
onPointerOver={e => {
  e.stopPropagation()
  // ...
}}
```

even if you don't want this object to respond to the pointer event. If you do want to handle the event as well as using `stopPropagation()`, remember that the pointerout events will happen **during** the `stopPropagation()` call. You probably want your other event handling to happen after this.

### Pointer capture

Because events go to all intersected objects, capturing the pointer also works differently. In the DOM, the capturing object **replaces** the hit test, but in React Three Fiber, the capturing object is **added** to the hit test result: if the capturing object was not hit, then all of the hit objects (and their ancestors) get the event first, followed by the capturing object and its ancestors. The capturing object can also use `event.stopPropagation()` so that objects that really were hit get pointerout events.

Note that you can access the `setPointerCapture` and `releasePointerCapture` methods **only** via `event.target`: they don't get added to the `Object3D` instances in the scene graph.

`setPointerCapture` and `releasePointerCapture` take a `pointerId` parameter like in the DOM, but for now they don't have support for multiple active pointers. PRs are welcome!

```jsx
onPointerDown={e => {
  // Only the mesh closest to the camera will be processed
  e.stopPropagation()
  // You may optionally capture the target
  e.target.setPointerCapture(e.pointerId)
}}
onPointerUp={e => {
  e.stopPropagation()
  // Optionally release capture
  e.target.releasePointerCapture(e.pointerId)
}}
```

### Customizing the event settings

For some advanced usage it's possible to customize the setting of the event manager globally with the `events` prop on `<Canvas/>`:

```tsx
import { Canvas, events } from '@react-three/fiber'

const eventManagerFactory: Parameters<typeof Canvas>[0]['events'] = (state) => ({
  // Default configuration
  ...events(state),

  // Determines if the event layer is active
  enabled: true,

  // Event layer priority, higher prioritized layers come first and may stop(-propagate) lower layer
  priority: 1,

  // The filter can re-order or re-structure the intersections
  filter: (items: THREE.Intersection[], state: RootState) => items,

  // The compute defines how pointer events are translated into the raycaster and pointer vector2
  compute: (event: DomEvent, state: RootState, previous?: RootState) => {
    state.pointer.set((event.offsetX / state.size.width) * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1)
    state.raycaster.setFromCamera(state.pointer, state.camera)
  },

  // Find more configuration default on ./packages/fiber/src/web/events.ts
  // And type definitions in ./packages/fiber/src/core/events.ts
})

function App() {
  return (
    <Canvas events={eventManagerFactory}>
}
```

### Using a different target element

There are cases in which you may want to connect the event handlers to another DOM element instead of the canvas. This is usually done to have events on a shared parent, which allows both the canvas, and dom overlays to receive events.

You can either use the event manager:

```jsx
const events => useThree(state => state.events)
useEffect(() => {
  state.events.connect(domNode)
```

Or, the `eventSource` shortcut on the canvas (DOM only), which accepts dom-nodes and React.RefObjects to dom-nodes.

```jsx
function App() {
  const target = useRef()
  return (
    <div ref={target}>
      <Canvas eventSource={target.current}>
```

### Using a different prefix (DOM only)

By default Fiber will use offsetX/offsetY to set up the raycaster. You can change this with the `eventPrefix` shortcut.

```jsx
function App() {
  return (
    <Canvas eventPrefix="client">
```

### Allow raycast without user interaction

By default Fiber will only raycast when the user is interacting with the canvas. If, for instance, the camera moves a hoverable object underneath the cursor it will not trigger a hover event. If this is wanted behaviour you can force a raycast by executing `update()`, call it whenever necessary.

```jsx
const events => useThree(state => state.events)
useEffect(() => {
  // Will trigger a onPointerMove with the last-known pointer event
  state.events.update()
```

You can abstract this into more complex logic.

```jsx
function RaycastWhenCameraMoves() {
  const matrix = new THREE.Matrix4()
  useFrame((state) => {
    // Act only when the camera has moved
    if (!matrix.equals(state.camera.matrixWorld)) {
      state.events.update()
      matrix.copy(state.camera.matrixWorld)
    }
  })
}
```
