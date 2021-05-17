import { lazy } from 'react'

//const Viewcube = { descr: '', tags: [], Component: lazy(() => import('./Viewcube')), dev: true }
const Selection = { descr: '', tags: [], Component: lazy(() => import('./Selection')), dev: true }
const Pointcloud = { descr: '', tags: [], Component: lazy(() => import('./Pointcloud')), dev: true, bright: true }
const Gestures = { descr: '', tags: [], Component: lazy(() => import('./Gestures')), bright: false }
const Reparenting = { descr: '', tags: [], Component: lazy(() => import('./Reparenting')), dev: true, bright: true }
const MultiRender = { descr: '', tags: [], Component: lazy(() => import('./MultiRender')), dev: true, bright: true }
const MultiScene = { descr: '', tags: [], Component: lazy(() => import('./MultiScene')), dev: true }
const Lines = { descr: '', tags: [], Component: lazy(() => import('./Lines')), dev: true }
const StopPropagation = {
  descr: '',
  tags: [],
  Component: lazy(() => import('./StopPropagation')),
  dev: true,
  bright: true,
}
const ContextMenuOverride = { descr: '', tags: [], Component: lazy(() => import('./ContextMenuOverride')), dev: true }
const ClickAndHover = { descr: '', tags: [], Component: lazy(() => import('./ClickAndHover')), dev: true, bright: true }
const SVGRenderer = { descr: '', tags: [], Component: lazy(() => import('./SVGRenderer')), dev: true, bright: true }
const ResetProps = { descr: '', tags: [], Component: lazy(() => import('./ResetProps')), dev: true, bright: true }
//const Animation = { descr: '', tags: [], Component: lazy(() => import('./Animation')), dev: true, bright: true }
const AutoDispose = { descr: '', tags: [], Component: lazy(() => import('./AutoDispose')), dev: true, bright: true }
const Layers = { descr: '', tags: [], Component: lazy(() => import('./Layers')), dev: true, bright: true }
const Test = { descr: '', tags: [], Component: lazy(() => import('./Test')), dev: true, bright: true }
const SuspenseAndErrors = {
  descr: '',
  tags: [],
  Component: lazy(() => import('./SuspenseAndErrors')),
  dev: true,
  bright: true,
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
  Test,
  SuspenseAndErrors,
  ContextMenuOverride,
}
