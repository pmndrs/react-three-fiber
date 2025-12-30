import { lazy } from 'react'

//* Default Examples ==============================
// Examples that work with both WebGL and WebGPU renderers
const Activity = { Component: lazy(() => import('./default/Activity')) }
const AutoDispose = { Component: lazy(() => import('./default/AutoDispose')) }
const CanvasDebounceFixed = { Component: lazy(() => import('./default/CanvasDebounceFixed')) }
const ChangeTexture = { Component: lazy(() => import('./default/ChangeTexture')) }
const ClickAndHover = { Component: lazy(() => import('./default/ClickAndHover')) }
const ContextMenuOverride = { Component: lazy(() => import('./default/ContextMenuOverride')) }
const FlushSync = { Component: lazy(() => import('./default/FlushSync')) }
const FileDragDrop = { Component: lazy(() => import('./default/FileDragDrop')) }
const Gestures = { Component: lazy(() => import('./default/Gestures')) }
const Gltf = { Component: lazy(() => import('./default/Gltf')) }
const Inject = { Component: lazy(() => import('./default/Inject')) }
const Layers = { Component: lazy(() => import('./default/Layers')) }
const MultiMaterial = { Component: lazy(() => import('./default/MultiMaterial')) }
const MultiRender = { Component: lazy(() => import('./default/MultiRender')) }
const PortalTest = { Component: lazy(() => import('./default/PortalTest')) }
const ResetProps = { Component: lazy(() => import('./default/ResetProps')) }
const Selection = { Component: lazy(() => import('./default/Selection')) }
const StopPropagation = { Component: lazy(() => import('./default/StopPropagation')) }
const SuspenseAndErrors = { Component: lazy(() => import('./default/SuspenseAndErrors')) }
const SuspenseMaterial = { Component: lazy(() => import('./default/SuspenseMaterial')) }
const Test = { Component: lazy(() => import('./default/Test')) }
const Viewcube = { Component: lazy(() => import('./default/Viewcube')) }
const ViewTracking = { Component: lazy(() => import('./default/ViewTracking')) }

//* Legacy Examples ==============================
// WebGL-only examples using features not yet supported in WebGPU
const EventPriority = { Component: lazy(() => import('./legacy/EventPriority')) }
const Lines = { Component: lazy(() => import('./legacy/Lines')) }
const MultiView = { Component: lazy(() => import('./legacy/MultiView')) }
const Pointcloud = { Component: lazy(() => import('./legacy/Pointcloud')) }
const Portals = { Component: lazy(() => import('./legacy/Portals')) }
const Reparenting = { Component: lazy(() => import('./legacy/Reparenting')) }
const SVGRenderer = { Component: lazy(() => import('./legacy/SVGRenderer')) }

//* WebGPU Examples ==============================
// Examples showcasing WebGPU renderer with TSL
const WebGPU = { Component: lazy(() => import('./webgpu/WebGPU')) }
const WebGPUSharedUniforms = { Component: lazy(() => import('./webgpu/WebGPUSharedUniforms')) }
const WebGPURagingSea = { Component: lazy(() => import('./webgpu/WebGPURagingSea')) }
const WebGPUMotionBlur = { Component: lazy(() => import('./webgpu/WebGPUMotionBlur')) }

//* useFrameNext Examples ==============================
// Showcasing the new useFrameNext hook features
const UseFrameNextFPS = { Component: lazy(() => import('./webgpu/UseFrameNextFPS')) }
const UseFrameNextPhases = { Component: lazy(() => import('./webgpu/UseFrameNextPhases')) }
const UseFrameNextControls = { Component: lazy(() => import('./webgpu/UseFrameNextControls')) }

export {
  // Default
  Activity,
  AutoDispose,
  CanvasDebounceFixed,
  ChangeTexture,
  ClickAndHover,
  ContextMenuOverride,
  FlushSync,
  FileDragDrop,
  Gestures,
  Gltf,
  Inject,
  Layers,
  MultiMaterial,
  MultiRender,
  ResetProps,
  Selection,
  StopPropagation,
  SuspenseAndErrors,
  SuspenseMaterial,
  Test,
  Viewcube,
  ViewTracking,
  PortalTest,
  // Legacy
  EventPriority,
  Lines,
  MultiView,
  Pointcloud,
  Portals,
  Reparenting,
  SVGRenderer,
  // WebGPU
  WebGPU,
  WebGPUSharedUniforms,
  WebGPURagingSea,
  WebGPUMotionBlur,
  // useFrameNext
  UseFrameNextFPS,
  UseFrameNextPhases,
  UseFrameNextControls,
}
