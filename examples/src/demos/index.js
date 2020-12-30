import { lazy } from 'react'

const Font = { descr: '', tags: [], Component: lazy(() => import('./Font')), bright: false }
const Gestures = { descr: '', tags: [], Component: lazy(() => import('./Gestures')), bright: false }
const GltfPlanet = { descr: '', tags: [], Component: lazy(() => import('./GltfPlanet')), bright: false }
const MeshLine = { descr: '', tags: [], Component: lazy(() => import('./MeshLine')), bright: true }
const Montage = { descr: '', tags: [], Component: lazy(() => import('./Montage')), bright: true }
const Physics = { descr: '', tags: [], Component: lazy(() => import('./Physics')), bright: false }
const Swarm = { descr: '', tags: [], Component: lazy(() => import('./Swarm')), bright: false }
const SVGLoader = { descr: '', tags: [], Component: lazy(() => import('./SVGLoader')), bright: false }
const VolumetricLight = { descr: '', tags: [], Component: lazy(() => import('./VolumetricLight')), bright: false }
const Refraction = { descr: '', tags: [], Component: lazy(() => import('./Refraction')), bright: false }

const Viewcube = { descr: '', tags: [], Component: lazy(() => import('./dev/Viewcube')), dev: true }
const Concurrent = { descr: '', tags: [], Component: lazy(() => import('./dev/Concurrent')), dev: true }
const Selection = { descr: '', tags: [], Component: lazy(() => import('./dev/Selection')), dev: true }
const Pointcloud = { descr: '', tags: [], Component: lazy(() => import('./dev/Pointcloud')), dev: true, bright: true }
const Reparenting = { descr: '', tags: [], Component: lazy(() => import('./dev/Reparenting')), dev: true, bright: true }
const MultiRender = { descr: '', tags: [], Component: lazy(() => import('./dev/MultiRender')), dev: true, bright: true }
const MultiScene = { descr: '', tags: [], Component: lazy(() => import('./dev/MultiScene')), dev: true }
const Hud = { descr: '', tags: [], Component: lazy(() => import('./dev/Hud')), dev: true }
const InstancedMesh = {
  descr: '',
  tags: [],
  Component: lazy(() => import('./dev/InstancedMesh')),
  dev: true,
  bright: true,
}
const GltfAnimation = { descr: '', tags: [], Component: lazy(() => import('./dev/GltfAnimation')), dev: true }
const ShaderMaterial = { descr: '', tags: [], Component: lazy(() => import('./dev/ShaderMaterial')), dev: true }
const SelectiveBloom = { descr: '', tags: [], Component: lazy(() => import('./dev/SelectiveBloom')), dev: true }
const Scroll = { descr: '', tags: [], Component: lazy(() => import('./dev/Scroll')), dev: true }
const Lines = { descr: '', tags: [], Component: lazy(() => import('./dev/Lines')), dev: true }
const WebGL2 = { descr: '', tags: [], Component: lazy(() => import('./dev/WebGL2')), dev: true }

const ClickAndHover = { descr: '', tags: [], Component: lazy(() => import('./tests/ClickAndHover')), dev: true }
const StopPropagation = { descr: '', tags: [], Component: lazy(() => import('./tests/StopPropagation')), dev: true }
const Debugging = { descr: '', tags: [], Component: lazy(() => import('./tests/Debugging')), dev: true }

export {
  Refraction,
  Swarm,
  Montage,
  Font,
  MeshLine,
  VolumetricLight,
  GltfPlanet,
  Physics,
  Gestures,
  GltfAnimation,
  SVGLoader,
  Hud,
  InstancedMesh,
  Lines,
  MultiRender,
  MultiScene,
  Pointcloud,
  Reparenting,
  Scroll,
  SelectiveBloom,
  ShaderMaterial,
  WebGL2,
  Selection,
  Concurrent,
  Viewcube,
  ClickAndHover,
  StopPropagation,
  Debugging,
}
