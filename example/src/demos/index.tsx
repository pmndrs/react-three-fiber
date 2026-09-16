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
// Work with both WebGL and WebGPU renderers
const defaultDemos = {
  Activity: demo(() => import('./default/Activity')),
  AutoDispose: demo(() => import('./default/AutoDispose')),
  ChangeTexture: demo(() => import('./default/ChangeTexture')),
  ClickAndHover: demo(() => import('./default/ClickAndHover')),
  ContextMenuOverride: demo(() => import('./default/ContextMenuOverride')),
  FileDragDrop: demo(() => import('./default/FileDragDrop')),
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
// WebGL-only, using features not yet supported in WebGPU
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
  WebGPURagingSea: demo(() => import('./webgpu/WebGPURagingSea')),
  WebGPUSharedUniforms: demo(() => import('./webgpu/WebGPUSharedUniforms')),
}

export const demoGroups: DemoGroup[] = [
  { name: 'default', demos: defaultDemos },
  { name: 'legacy', demos: legacyDemos },
  { name: 'webgpu', demos: webgpuDemos },
]
