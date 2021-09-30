# @react-three/fiber

## 7.0.7

### Patch Changes

- 0375896: Simplify useframe, support instanced event cancelation, silence disposal

## 7.0.6

### Patch Changes

- fb052ad: Fix babel-env browserslist transpiling into old code"

## 7.0.5

### Patch Changes

- c97794a: Add useLoader.clear(Loader, input)

## 7.0.4

### Patch Changes

- 974ecfb: Allow elements to define attachFns for specific mount/unmount

## 7.0.2

### Patch Changes

- a97aca3: Add controls state field
- 4c703d6: fix rttr didn't work with r130

## 7.0.0

### Major Changes

- 96ae1ad: fix javascript interpreting negative renderpriority as positive

This is a major breaking change that will fix an edge-case. It will only affect you if you used negative useFrame indicies, for instance

```jsx
useFrame(..., -1)
```

Surprisingly this disabled auto-rendering although the documentation says positive numbers only. As of v7 this will not take over the render loop.

```jsx
function Render() {
  // Takes over the render-loop, the user has the responsibility to render
  useFrame(({ gl, scene, camera }) => {
    gl.render(scene, camera)
  }, 1)

function RenderOnTop() {
  // This will render on top of the previous call
  useFrame(({ gl, ... }) => {
    gl.render(...)
  }, 2)

function A() {
  // Will *not* take over the render-loop, negative indices can still be useful for sorting
  useFrame(() => ..., -1)

function B() {
  // B's useFrame will execute *after* A's
  useFrame(() => ..., -2)
```

## 6.2.3

### Patch Changes

- 26bc7eb: typescript changes

## 6.2.2

### Patch Changes

- 4f44a2c: use more helpful name with event handling in rttr

## 6.2.1

### Patch Changes

- Fix stopPropagation logic

## 6.2.0

### Minor Changes

- Allow object3d instances to be attached

## 6.1.5

### Patch Changes

- fix(rttr): if children is undefined return an array to map with

## 6.1.4

### Patch Changes

- 6faa090: Add shape to types, exclude event functions from event data

## 6.1.3

### Patch Changes

- 71e72c0: Fix constructor args with attached children (#1348)
- 015fc03: Only set up pointer/wheel events as passive
- a160e08: Fix event setPointerCapture and stopPropagation.

## 6.1.2
