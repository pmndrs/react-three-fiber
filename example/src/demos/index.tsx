import { lazy } from 'react'

const AutoDispose = { Component: lazy(() => import('./AutoDispose')) }
const ClickAndHover = { Component: lazy(() => import('./ClickAndHover')) }
const ContextMenuOverride = { Component: lazy(() => import('./ContextMenuOverride')) }
const Gestures = { Component: lazy(() => import('./Gestures')) }
const Gltf = { Component: lazy(() => import('./Gltf')) }
const Inject = { Component: lazy(() => import('./Inject')) }
const Layers = { Component: lazy(() => import('./Layers')) }
const Lines = { Component: lazy(() => import('./Lines')) }
const MultiMaterial = { Component: lazy(() => import('./MultiMaterial')) }
const MultiRender = { Component: lazy(() => import('./MultiRender')) }
const MultiView = { Component: lazy(() => import('./MultiView')) }
const Pointcloud = { Component: lazy(() => import('./Pointcloud')) }
const Reparenting = { Component: lazy(() => import('./Reparenting')) }
const ResetProps = { Component: lazy(() => import('./ResetProps')) }
const Selection = { Component: lazy(() => import('./Selection')) }
const StopPropagation = { Component: lazy(() => import('./StopPropagation')) }
const SuspenseAndErrors = { Component: lazy(() => import('./SuspenseAndErrors')) }
const SuspenseMaterial = { Component: lazy(() => import('./SuspenseMaterial')) }
const SVGRenderer = { Component: lazy(() => import('./SVGRenderer')) }
const Test = { Component: lazy(() => import('./Test')) }
const Viewcube = { Component: lazy(() => import('./Viewcube')) }
const Portals = { Component: lazy(() => import('./Portals')) }
const ViewTracking = { Component: lazy(() => import('./ViewTracking')) }
const ChangeTexture = { Component: lazy(() => import('./ChangeTexture')) }
const WebGPU = { Component: lazy(() => import('./WebGPU')) }
const FlushSync = { Component: lazy(() => import('./FlushSync')) }

export {
  AutoDispose,
  ClickAndHover,
  ContextMenuOverride,
  Gestures,
  Gltf,
  Inject,
  Layers,
  Lines,
  MultiMaterial,
  MultiRender,
  Pointcloud,
  Reparenting,
  ResetProps,
  Selection,
  StopPropagation,
  SuspenseAndErrors,
  SuspenseMaterial,
  SVGRenderer,
  Test,
  Viewcube,
  MultiView,
  Portals,
  ViewTracking,
  ChangeTexture,
  WebGPU,
  FlushSync,
}
