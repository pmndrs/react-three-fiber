# @react-three/fiber

## 8.17.5

### Patch Changes

- 162dbbdd: fix: npmignore ignored types"

## 8.17.4

### Patch Changes

- 43866f4e: fix: rebuild with types

## 8.17.3

### Patch Changes

- 8363eb7a: fix: rebuild with types

## 8.17.2

### Patch Changes

- 6aa4eb28: fix: rebuild with types

## 8.17.1

### Patch Changes

- e5f3f4f9: fix: rebuild with types

## 8.17.0

### Minor Changes

- 3c22194d: feat: flushSync, native EventTarget

## 8.16.8

### Patch Changes

- 4748b365: fix: update is.equ to compare booleans

## 8.16.7

### Patch Changes

- 4d6408c7: fix(types): revert usage of future module JSX

## 8.16.6

### Patch Changes

- 03ab82fe: fix(applyProps): null check indeterminate instances

## 8.16.5

### Patch Changes

- cb913e01: fix: use fast JSX, future JSX types

## 8.16.4

### Patch Changes

- 1270d24c: fix: missing dependency on inject function

## 8.16.3

### Patch Changes

- 9c83502c: fix(Canvas): don't override camera frustum props

## 8.16.2

### Patch Changes

- e0900489: fix(useLoader): don't dispose of memoized loader

## 8.16.1

### Patch Changes

- 503efc2e: fix: prevent invalidate from piling up frames

## 8.16.0

### Minor Changes

- 6b0ea6eb: feat: add childadded event dispatch

## 8.15.19

### Patch Changes

- 74926b94: fix(types): avoid emitting THREE.XRFrame

## 8.15.18

### Patch Changes

- 8c01939a: fix: correctly pass frames in invalidate

## 8.15.17

### Patch Changes

- 16c2ee97: fix(types): support @types/three@0.162.0

## 8.15.16

### Patch Changes

- 71cd8f96: fix: tonemapping config overwrites userland
- 0bb12fd1: fix(types): remove usage of THREE.Vector

## 8.15.14

### Patch Changes

- 0afc9c12: fix: portal events, update examples

## 8.15.13

### Patch Changes

- 0a399f6d: fix(native): use MSAA for antialias on iOS

## 8.15.12

### Patch Changes

- 496d6f0d: fix: useLoader and XRFrame type fixes

## 8.15.11

### Patch Changes

- 3d9af04d: fix: update import from three examples

## 8.15.10

### Patch Changes

- 49158164: fix: don't recursively dispose primitives

## 8.15.9

### Patch Changes

- 4cbc5530: fix(native): deopt iOS blob URI path

## 8.15.8

### Patch Changes

- 70680832: fix: revert stable sort

## 8.15.7

### Patch Changes

- 07e39e2e: fix(types): remove use of Object3D generic

## 8.15.6

### Patch Changes

- 7bb2950b: experiment: stable object sort

## 8.15.5

### Patch Changes

- 0e44fd8b: fix(types): preserve deprecated JSX annotations

## 8.15.4

### Patch Changes

- 634e5db5: fix(native): harden Blob URI check for Android

## 8.15.3

### Patch Changes

- beab4344: fix(native): workaround Android content policy for Blob URI

## 8.15.2

### Patch Changes

- 086d3932: fix: size check and raycaster camera

## 8.15.1

### Patch Changes

- 2d39676d: fix: ignore deprecated types, use correct XRFrame definition

## 8.15.0

### Minor Changes

- cca8b6bb: feat: export buildGraph

## 8.14.7

### Patch Changes

- 0f63a287: fix(native): restore polyfill conversions, drop networking

## 8.14.6

### Patch Changes

- 465fa0fb: fix(native): revert usage of networking stack

## 8.14.5

### Patch Changes

- f372a5b5: fix(applyProps): loosen copy identity in dev

## 8.14.4

### Patch Changes

- dc7e5739: fix(native): amend BlobManager over globals

## 8.14.3

### Patch Changes

- d77b0990: fix(native): drop fsstat for react-native-web

## 8.14.2

### Patch Changes

- 33e8baef: fix: native perf, loader types

## 8.14.1

### Patch Changes

- c99907bf: fix(native): prefer local uri for fs

## 8.14.0

### Minor Changes

- 89e96bf4: feat: react-native-web, native globals fixes

## 8.13.9

### Patch Changes

- 44d57b3c: fix(native): TextureLoader should remain consistent with FileLoader

## 8.13.8

### Patch Changes

- 5da26d52: fix(useLoader): dispose loaders

## 8.13.7

### Patch Changes

- 37b9502a: fix(Canvas): pass scene prop

## 8.13.6

### Patch Changes

- 0597495c: fix: harden XR init against Renderer shim

## 8.13.5

### Patch Changes

- 7a3b543b: fix: three type regressions

## 8.13.4

### Patch Changes

- 824ee0f7: fix: safely diff instances

## 8.13.3

### Patch Changes

- ffdb5fc4: revert nested portals, up suspend-react

## 8.13.2

### Patch Changes

- bbabdf07: update suspend-react

## 8.13.1

### Patch Changes

- c9fe03ba: fix: primitive swap and reactive portals

## 8.13.0

### Minor Changes

- ecfc48b7: feat: CanvasProps alias, respect r152 color management

## 8.12.2

### Patch Changes

- c5193468: fix: safeguard window.devicePixelRatio

## 8.12.1

### Patch Changes

- 571f07ac: fix: safeguard window.devicePixelRatio

## 8.12.0

### Minor Changes

- 1928d095: feat: `scene` render prop for custom THREE.Scene

## 8.11.11

### Patch Changes

- f03c6ef8: feat: `scene` render prop for custom THREE.Scene

## 8.11.10

### Patch Changes

- 12907836: fix onpointerlostcapture which fired before pointerup

## 8.11.9

### Patch Changes

- 6b5f572c: fix: treeshake THREE.ColorManagement

## 8.11.8

### Patch Changes

- 350cd3f3: fix(Canvas): inline render-effect

## 8.11.7

### Patch Changes

- 96af62d5: fix: don't overwrite public cameras

## 8.11.6

### Patch Changes

- 7d319c18: Fix is.equ obj:shallow, allow it to test arrays 1 level deep, fix canvas.camera prop being stale

## 8.11.5

### Patch Changes

- c658f763: fix: update canvas prop types

## 8.11.4

### Patch Changes

- 970aa58b: fix: play nice with offscreencanvas

## 8.11.3

### Patch Changes

- 2bce569c: fix: progressively set colormanagement

## 8.11.2

### Patch Changes

- 41d655cd: fix: hmr, srgb encode

## 8.11.1

### Patch Changes

- 58cadeff: fix: skip circular onUpdate calls

## 8.11.0

### Minor Changes

- 2917a47b: events.update, allow raycast w/o user interaction
- 521bfb07: events.update, allow raycast w/o user interaction

## 8.10.4

### Patch Changes

- d9e6316d: fix: transpile class properties

## 8.10.3

### Patch Changes

- d06d2879: fix: align useLoader type, public fields from builds

## 8.10.2

### Patch Changes

- 564edbbb: fix port inject layers, it should allow root props to overwrite indefined portal props"

## 8.10.1

### Patch Changes

- bfa0298f: fix memoized identity

## 8.10.0

### Minor Changes

- 24c4dba4: shortcut for shadow type

## 8.9.2

### Patch Changes

- 2aeb6500: fix: primitives are incorrectly swapped on key change in maps

## 8.9.1

### Patch Changes

- 0cf11797: fix(events): type spread event props

## 8.9.0

### Minor Changes

- a458b4dd: fix(loop): export flush methods and types

## 8.8.11

### Patch Changes

- 2068f0cc: fix: events pointerlock, useLoader extension types

## 8.8.10

### Patch Changes

- 00c24718: fix: invalidate pierced props

## 8.8.9

### Patch Changes

- 4254400e: fix(createPortal): use correct JSX type

## 8.8.8

### Patch Changes

- fcb183e3: fix: call onUpdate for attached children prop update

## 8.8.7

### Patch Changes

- bedb16e7: fix: prefer named functions, for loops in hot paths

## 8.8.6

### Patch Changes

- 02a558bb: fix: upgrade deps

## 8.8.5

### Patch Changes

- 530a06d6: fix: upgrade deps to work-around CRA

## 8.8.4

### Patch Changes

- 2f2dc9f9: chore: upgrade bridge to harden suspense behavior

## 8.8.3

### Patch Changes

- 9f571239: fix #2506, events should fall back to rootstate"

## 8.8.2

### Patch Changes

- dc389ed6: fix(Canvas): prevent remount on context update

## 8.8.1

### Patch Changes

- 370d3ae5: refactor: pull context bridge from its-fine

## 8.8.0

### Minor Changes

- 46d8b440: bridge cross-container context

## 8.7.4

### Patch Changes

- 259c8895: fix: use self to get global context before window

## 8.7.3

### Patch Changes

- eb5a3be4: fix: if there is an eventsource pointerevent will be set to none

## 8.7.2

### Patch Changes

- 7f801e60: fix: events in portals carry the wrong raycaster, camera, etc

## 8.7.1

### Patch Changes

- 962cc270: fix: allow canvas eventsource to be a ref

## 8.7.0

### Minor Changes

- f5db1b78: feat: useInstanceHandle, flushGlobalEffects

## 8.6.2

### Patch Changes

- 57c12e9c: fix(types): @react-three/drei declaration files

## 8.6.1

### Patch Changes

- 7a0b5670: fix(core): don't append to unmounted containers

## 8.6.0

### Minor Changes

- 85c80e70: eventsource and eventprefix on the canvas component

## 8.5.1

### Patch Changes

- 87821d9: fix: null-check instance.children on reconstruct

## 8.5.0

### Minor Changes

- edc8252: feat: handle primitive children, auto-attach via instanceof

## 8.3.1

### Patch Changes

- aaeb2b8: fix(types): accept readonly arrays for vector props

## 8.3.0

### Minor Changes

- 9c450ec: feat: improve errors

## 8.2.3

### Patch Changes

- b8d2eab: fix: improve useLoader signature, initial size on createRoot

## 8.2.2

### Patch Changes

- acd6f04: fix: warn on stray text

## 8.2.1

### Patch Changes

- 25e35a1: fix: prefer useLayoutEffect in react-native

## 8.2.0

### Minor Changes

- 9770d7d: feat: expose ThreeElements interface for JSX elements

## 8.1.0

### Minor Changes

- 8d0f708c: Expose position information in state.size

## 8.0.27

### Patch Changes

- 7940995: fix: resume on xrsession end, export internal events

## 8.0.26

### Patch Changes

- 7b6df9df: fix: infinite loop updating cam viewport

## 8.0.25

### Patch Changes

- b7cd0f42: update viewport on camera changes

## 8.0.24

### Patch Changes

- ee8e785: fix: attach timings

## 8.0.23

### Patch Changes

- 29d03c64: revert multi attach

## 8.0.22

### Patch Changes

- 419e854: fix: always prepare primitives

## 8.0.21

### Patch Changes

- 3098b9b: fix: resizing in worker contexts, copy over attachments on reconstruct

## 8.0.20

### Patch Changes

- 4c87bce: fix: attach, devtools, and perf fixes

## 8.0.19

### Patch Changes

- 360b45a: fix: handle attach on reconstruct

## 8.0.18

### Patch Changes

- be567c1: fix: suspense attach and three compat in webpack

## 8.0.17

### Patch Changes

- 9e3369e: fix dom resize, improve native tree shaking

## 8.0.16

### Patch Changes

- 669c45c: correctly type useLoader results

## 8.0.15

### Patch Changes

- c4715d5f: allow invalidate to preempt more than 1 frame

## 8.0.14

### Patch Changes

- 5559a119: Add support for recoverable errors

## 8.0.13

### Patch Changes

- 9d77d8e2: fix: detach attribute removal

## 8.0.12

### Patch Changes

- 3d10413f: fix portal layers

## 8.0.11

### Patch Changes

- 5167b1e4: memoized.args can be undefined

## 8.0.10

### Patch Changes

- eb321afd: fix: remount bug, allow portals to inject custom size

## 8.0.9

### Patch Changes

- 624df949: fix: canvas unmount race condition"

## 8.0.8

### Patch Changes

- 952a566: fix: react SSR

## 8.0.7

### Patch Changes

- f63806b: fix: react SSR

## 8.0.6

### Patch Changes

- d4bafb9: fix re-parenting, useframe not working properly in portals, attach crash

## 8.0.5

### Patch Changes

- 227c328: fix pointer for root and portals

## 8.0.4

### Patch Changes

- e981a72: fix: mock three color management, loosen peer dep

## 8.0.3

### Patch Changes

- 3252aed: setevents needs to spread and be mirrored in portals

## 8.0.2

### Patch Changes

- 8035d1f: fix: legacy mode

## 8.0.1

### Patch Changes

- 26db195: add legacy flag to turn of three.colormanagement

## 8.0.0

### Major Changes

- 385ba9c: v8 major, react-18 compat
- 04c07b8: v8 major, react-18 compat

### Patch Changes

- 347ea79: new beta for library testing

## 8.0.0-beta.0

### Major Changes

- 385ba9c: v8 major, react-18 compat

## 8.0.0-beta.0

### Patch Changes

- cf6316c: new beta for library testing

## 7.0.25

### Patch Changes

- 8698734: Release latest patches

## 7.0.24

### Patch Changes

- 7f46ddf: cleanup captured pointers when released (#1914)

## 7.0.23

### Patch Changes

- 30d38b1: remove logs

## 7.0.22

### Patch Changes

- 259e1fa: add camera:manual

## 7.0.21

### Patch Changes

- 65e4147: up usemeasure, add last event to internals"

## 7.0.20

### Patch Changes

- 54cb0fd: update react-use-measure, allow it to use the offsetSize

## 7.0.19

### Patch Changes

- 7aa2eab: fix: remove zustand subcribe selector

## 7.0.18

### Patch Changes

- 6780f58: fix unmount pointer capture

## 7.0.17

### Patch Changes

- 894c550: fix: event count

## 7.0.16

### Patch Changes

- c7a4220: patch: applyprops returns the same instance

## 7.0.15

### Patch Changes

- c5645e8: fix primitve leftovers on switch

## 7.0.14

### Patch Changes

- 05af996: fix: revert the is function

## 7.0.13

### Patch Changes

- f256558: fix(core): don't overwrite camera rotation
- 51e6fc9: fix(core): safely handle external instances

## 7.0.12

### Patch Changes

- 0df6073: fix: missed events

## 7.0.11

### Patch Changes

- 62b0a3a: fix: event order of missed pointers

## 7.0.10

### Patch Changes

- e019dd4: fixes

## 7.0.9

### Patch Changes

- cd266e4: Fix diffProps dashed keys

## 7.0.8

### Patch Changes

- 6f68406: Allow getCurrentViewport to receive an array

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
