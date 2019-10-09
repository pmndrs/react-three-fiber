import { lazy } from 'react'

const Bloom = { descr: '', tags: [], Component: lazy(() => import('./Bloom')) }
const Font = { descr: '', tags: [], Component: lazy(() => import('./Font')) }
const Gestures = { descr: '', tags: [], Component: lazy(() => import('./Gestures')) }
const GltfPlanet = { descr: '', tags: [], Component: lazy(() => import('./GltfPlanet')) }
const MeshLine = { descr: '', tags: [], Component: lazy(() => import('./MeshLine')) }
const Montage = { descr: '', tags: [], Component: lazy(() => import('./Montage')) }
const Physics = { descr: '', tags: [], Component: lazy(() => import('./Physics')) }
const Swarm = { descr: '', tags: [], Component: lazy(() => import('./Swarm')) }
const Textures = { descr: '', tags: [], Component: lazy(() => import('./Textures')) }
const SVGLoader = { descr: '', tags: [], Component: lazy(() => import('./SVGLoader')) }
const VolumetricLight = { descr: '', tags: [], Component: lazy(() => import('./VolumetricLight')) }

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

export {
  Swarm,
  Montage,
  Font,
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
  MeshLine,
  MultiRender,
  MultiScene,
  Pointcloud,
  Reparenting,
  Scroll,
  SelectiveBloom,
  ShaderMaterial,
  Suspense,
  Test,
  VR,
}
