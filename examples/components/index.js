import { lazy } from 'react'

const Bloom = { descr: '', tags: [], Component: lazy(() => import('./Bloom')) }
const Font = { descr: '', tags: [], Component: lazy(() => import('./Font')) }
const Gestures = { descr: '', tags: [], Component: lazy(() => import('./Gestures')) }
const GltfAnimation = { descr: '', tags: [], Component: lazy(() => import('./GltfAnimation')) }
const GltfPlanet = { descr: '', tags: [], Component: lazy(() => import('./GltfPlanet')) }
const Hud = { descr: '', tags: [], Component: lazy(() => import('./Hud')) }
const InstancedMesh = { descr: '', tags: [], Component: lazy(() => import('./InstancedMesh')) }
const Lines = { descr: '', tags: [], Component: lazy(() => import('./Lines')) }
const MeshLine = { descr: '', tags: [], Component: lazy(() => import('./MeshLine')) }
const Montage = { descr: '', tags: [], Component: lazy(() => import('./Montage')) }
const MultiRender = { descr: '', tags: [], Component: lazy(() => import('./MultiRender')) }
const MultiScene = { descr: '', tags: [], Component: lazy(() => import('./MultiScene')) }
const Physics = { descr: '', tags: [], Component: lazy(() => import('./Physics')) }
const Pointcloud = { descr: '', tags: [], Component: lazy(() => import('./Pointcloud')) }
const Reparenting = { descr: '', tags: [], Component: lazy(() => import('./Reparenting')) }
const Scroll = { descr: '', tags: [], Component: lazy(() => import('./Scroll')) }
const SelectiveBloom = { descr: '', tags: [], Component: lazy(() => import('./SelectiveBloom')) }
const ShaderMaterial = { descr: '', tags: [], Component: lazy(() => import('./ShaderMaterial')) }
const Stars = { descr: '', tags: [], Component: lazy(() => import('./Stars')) }
const Suspense = { descr: '', tags: [], Component: lazy(() => import('./Suspense')) }
const Swarm = { descr: '', tags: [], Component: lazy(() => import('./Swarm')) }
const Test = { descr: '', tags: [], Component: lazy(() => import('./Test')) }
const Textures = { descr: '', tags: [], Component: lazy(() => import('./Textures')) }
const SVGLoader = { descr: '', tags: [], Component: lazy(() => import('./SVGLoader')) }
const VolumetricLight = { descr: '', tags: [], Component: lazy(() => import('./VolumetricLight')) }
const VR = { descr: '', tags: [], Component: lazy(() => import('./VR')) }

export {
  Swarm,
  Font,
  Bloom,
  Gestures,
  GltfAnimation,
  GltfPlanet,
  Hud,
  InstancedMesh,
  Lines,
  MeshLine,
  Montage,
  MultiRender,
  MultiScene,
  Physics,
  Pointcloud,
  Reparenting,
  Scroll,
  SelectiveBloom,
  ShaderMaterial,
  Stars,
  Suspense,
  Test,
  Textures,
  SVGLoader,
  VolumetricLight,
  VR,
}
