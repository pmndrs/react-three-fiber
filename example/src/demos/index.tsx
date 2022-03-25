import { lazy } from 'react'

const Viewcube = { Component: lazy(() => import('./Viewcube')) }
const Selection = { Component: lazy(() => import('./Selection')) }
const Pointcloud = { Component: lazy(() => import('./Pointcloud')) }
const Gestures = { Component: lazy(() => import('./Gestures')) }
const Reparenting = { Component: lazy(() => import('./Reparenting')) }
const MultiRender = { Component: lazy(() => import('./MultiRender')) }
const MultiScene = { Component: lazy(() => import('./MultiScene')) }
const Lines = { Component: lazy(() => import('./Lines')) }
const StopPropagation = {
  Component: lazy(() => import('./StopPropagation')),
}
const ContextMenuOverride = {
  Component: lazy(() => import('./ContextMenuOverride')),
}
const ClickAndHover = { Component: lazy(() => import('./ClickAndHover')) }
const SVGRenderer = { Component: lazy(() => import('./SVGRenderer')) }
const ResetProps = { Component: lazy(() => import('./ResetProps')) }
//const Animation = { Component: lazy(() => import('./Animation')), }
const AutoDispose = { Component: lazy(() => import('./AutoDispose')) }
const Layers = { Component: lazy(() => import('./Layers')) }
const MultiMaterial = { Component: lazy(() => import('./MultiMaterial')) }
const Gltf = { Component: lazy(() => import('./Gltf')) }
const Test = { Component: lazy(() => import('./Test')) }
const SuspenseAndErrors = {
  Component: lazy(() => import('./SuspenseAndErrors')),
}

export {
  Reparenting,
  MultiRender,
  MultiScene,
  Selection,
  Lines,
  Gestures,
  StopPropagation,
  ClickAndHover,
  Pointcloud,
  SVGRenderer,
  ResetProps,
  //Animation,
  AutoDispose,
  Layers,
  MultiMaterial,
  SuspenseAndErrors,
  ContextMenuOverride,
  Viewcube,
  Gltf,
  Test,
}
