import { lazy } from 'react'

const Bloom = { descr: '', tags: [], Component: lazy(() => import('./Bloom')), bright: false }
const Font = { descr: '', tags: [], Component: lazy(() => import('./Font')), bright: false }
const Gestures = { descr: '', tags: [], Component: lazy(() => import('./Gestures')), bright: false }
const GltfPlanet = { descr: '', tags: [], Component: lazy(() => import('./GltfPlanet')), bright: false }
const MeshLine = { descr: '', tags: [], Component: lazy(() => import('./MeshLine')), bright: true }
const Montage = { descr: '', tags: [], Component: lazy(() => import('./Montage')), bright: true }
const Physics = { descr: '', tags: [], Component: lazy(() => import('./Physics')), bright: false }
const Swarm = { descr: '', tags: [], Component: lazy(() => import('./Swarm')), bright: false }
const Textures = { descr: '', tags: [], Component: lazy(() => import('./Textures')), bright: false }
const SVGLoader = { descr: '', tags: [], Component: lazy(() => import('./SVGLoader')), bright: false }
const VolumetricLight = { descr: '', tags: [], Component: lazy(() => import('./VolumetricLight')), bright: false }
const Refraction = { descr: '', tags: [], Component: lazy(() => import('./Refraction')), bright: false }

const Test = { descr: '', tags: [], Component: lazy(() => import('./Test')), dev: true }
const Pointcloud = { descr: '', tags: [], Component: lazy(() => import('./Pointcloud')), dev: true }
const Reparenting = { descr: '', tags: [], Component: lazy(() => import('./Reparenting')), dev: true }
const MultiRender = { descr: '', tags: [], Component: lazy(() => import('./MultiRender')), dev: true }
const MultiScene = { descr: '', tags: [], Component: lazy(() => import('./MultiScene')), dev: true }
const Hud = { descr: '', tags: [], Component: lazy(() => import('./Hud')), dev: true }
const InstancedMesh = { descr: '', tags: [], Component: lazy(() => import('./InstancedMesh')), dev: true }
const GltfAnimation = { descr: '', tags: [], Component: lazy(() => import('./GltfAnimation')), dev: true }
const VR = { descr: '', tags: [], Component: lazy(() => import('./VR')), dev: true }
const ShaderMaterial = { descr: '', tags: [], Component: lazy(() => import('./ShaderMaterial')), dev: true }
const Suspense = { descr: '', tags: [], Component: lazy(() => import('./Suspense')), dev: true }
const SelectiveBloom = { descr: '', tags: [], Component: lazy(() => import('./SelectiveBloom')), dev: true }
const Scroll = { descr: '', tags: [], Component: lazy(() => import('./Scroll')), dev: true }
const Lines = { descr: '', tags: [], Component: lazy(() => import('./Lines')), dev: true }
const WebGL2 = { descr: '', tags: [], Component: lazy(() => import('./WebGL2')), dev: true }

export {
  Refraction,
  Swarm,
  Montage,
  Font,
  MeshLine,
  VolumetricLight,
  GltfPlanet,
  Physics,
  Textures,
  Gestures,
  Bloom,
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
  Suspense,
  WebGL2,
  Test,
  VR,
}
