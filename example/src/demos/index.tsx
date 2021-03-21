import { lazy } from 'react'

//const Viewcube = { descr: '', tags: [], Component: lazy(() => import('./dev/Viewcube')), dev: true }
const Selection = { descr: '', tags: [], Component: lazy(() => import('./dev/Selection')), dev: true }
const Pointcloud = { descr: '', tags: [], Component: lazy(() => import('./dev/Pointcloud')), dev: true, bright: true }
const Gestures = { descr: '', tags: [], Component: lazy(() => import('./dev/Gestures')), bright: false }
const Reparenting = { descr: '', tags: [], Component: lazy(() => import('./dev/Reparenting')), dev: true, bright: true }
const MultiRender = { descr: '', tags: [], Component: lazy(() => import('./dev/MultiRender')), dev: true, bright: true }
const MultiScene = { descr: '', tags: [], Component: lazy(() => import('./dev/MultiScene')), dev: true }
const Lines = { descr: '', tags: [], Component: lazy(() => import('./dev/Lines')), dev: true }
const StopPropagation = { descr: '', tags: [], Component: lazy(() => import('./dev/StopPropagation')), dev: true, bright: true  }
const ClickAndHover = { descr: '', tags: [], Component: lazy(() => import('./dev/ClickAndHover')), dev: true, bright: true  }
const SVGRenderer = { descr: '', tags: [], Component: lazy(() => import('./dev/SVGRenderer')), dev: true, bright: true  }
const ResetProps = { descr: '', tags: [], Component: lazy(() => import('./dev/ResetProps')), dev: true, bright: true  }

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
}
