import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

//* Demo Registry ==============================
// The single table of contents for the examples app. App.tsx derives the panel, the
// grouping and the dot colors from `demoGroups`, so adding a demo here is the whole job:
// a demo that is not in a group is not in the app.

export interface Demo {
  Component: LazyExoticComponent<ComponentType>
}

export interface DemoGroup {
  name: 'default' | 'legacy' | 'webgpu'
  demos: Record<string, Demo>
}

const demo = (load: () => Promise<{ default: ComponentType }>): Demo => ({ Component: lazy(load) })

//* Default Examples ==============================
// Core features on the root entry, `@react-three/fiber`, which renders with WebGPURenderer
// (falling back to its WebGL2 backend where the browser has no WebGPU)
const defaultDemos = {
  Activity: demo(() => import('./default/Activity')),
  AutoDispose: demo(() => import('./default/AutoDispose')),
  AutoNeedsUpdate: demo(() => import('./default/AutoNeedsUpdate')),
  ChangeTexture: demo(() => import('./default/ChangeTexture')),
  ClickAndHover: demo(() => import('./default/ClickAndHover')),
  ContextMenuOverride: demo(() => import('./default/ContextMenuOverride')),
  FileDragDrop: demo(() => import('./default/FileDragDrop')),
  FixedTimestep: demo(() => import('./default/FixedTimestep')),
  FlushSync: demo(() => import('./default/FlushSync')),
  Gestures: demo(() => import('./default/Gestures')),
  Gltf: demo(() => import('./default/Gltf')),
  HtmlBetweenCanvases: demo(() => import('./default/HtmlBetweenCanvases')),
  Inject: demo(() => import('./default/Inject')),
  Layers: demo(() => import('./default/Layers')),
  MultiMaterial: demo(() => import('./default/MultiMaterial')),
  MultiRender: demo(() => import('./default/MultiRender')),
  NestedCamera: demo(() => import('./default/NestedCamera')),
  PortalTest: demo(() => import('./default/PortalTest')),
  ResetProps: demo(() => import('./default/ResetProps')),
  Selection: demo(() => import('./default/Selection')),
  StopPropagation: demo(() => import('./default/StopPropagation')),
  SuspenseAndErrors: demo(() => import('./default/SuspenseAndErrors')),
  SuspenseMaterial: demo(() => import('./default/SuspenseMaterial')),
  Viewcube: demo(() => import('./default/Viewcube')),
  ViewTracking: demo(() => import('./default/ViewTracking')),
}

//* Legacy Examples ==============================
// WebGLRenderer via `@react-three/fiber/legacy`: GLSL materials, WebGL-only drei helpers, custom renderers
const legacyDemos = {
  EventPriority: demo(() => import('./legacy/EventPriority')),
  Lines: demo(() => import('./legacy/Lines')),
  MultiView: demo(() => import('./legacy/MultiView')),
  Pointcloud: demo(() => import('./legacy/Pointcloud')),
  Portals: demo(() => import('./legacy/Portals')),
  Reparenting: demo(() => import('./legacy/Reparenting')),
  SVGRenderer: demo(() => import('./legacy/SVGRenderer')),
}

//* WebGPU Examples ==============================
// The WebGPU renderer, TSL resource hooks, and the useFrame scheduler
const webgpuDemos = {
  UseFrameControls: demo(() => import('./webgpu/UseFrameControls')),
  UseFrameFPS: demo(() => import('./webgpu/UseFrameFPS')),
  UseFramePhases: demo(() => import('./webgpu/UseFramePhases')),
  VisibilityEvents: demo(() => import('./webgpu/VisibilityEvents')),
  WebGPU: demo(() => import('./webgpu/WebGPU')),
  WebGPUFog: demo(() => import('./webgpu/WebGPUFog')),
  WebGPUMotionBlur: demo(() => import('./webgpu/WebGPUMotionBlur')),
  WebGPUMultiCanvas: demo(() => import('./webgpu/WebGPUMultiCanvas')),
  WebGPUPrimaryOnly: demo(() => import('./webgpu/WebGPUPrimaryOnly')),
  WebGPURendererRelease: demo(() => import('./webgpu/WebGPURendererRelease')),
  WebGPURagingSea: demo(() => import('./webgpu/WebGPURagingSea')),
  WebGPUSharedUniforms: demo(() => import('./webgpu/WebGPUSharedUniforms')),
  WebGPUShareOptOut: demo(() => import('./webgpu/WebGPUShareOptOut')),
}

export const demoGroups: DemoGroup[] = [
  { name: 'default', demos: defaultDemos },
  { name: 'legacy', demos: legacyDemos },
  { name: 'webgpu', demos: webgpuDemos },
]
