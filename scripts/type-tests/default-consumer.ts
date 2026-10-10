// An app's view of @react-three/fiber, compiled against the built declarations with skipLibCheck off.
import type {
  ReactThreeFiber,
  RootState,
  ThreeElements,
  ThreeExports,
  WebGPURootState,
} from '../../packages/fiber/dist/index'
import { getThree, useFrame, useRenderTarget, useThree } from '../../packages/fiber/dist/index'
import type { WebGLRenderer, WebGLRenderTarget } from 'three'
import type { WebGPURenderer, RenderTarget } from 'three/webgpu'

type Assert<T extends true> = T

// The root entry renders with WebGPU, so its JSX map is the `three/webgpu` namespace
type HasMesh = Assert<'Mesh' extends keyof ThreeExports ? true : false>
type HasWebGLRenderer = Assert<'WebGLRenderer' extends keyof ThreeExports ? false : true>
type HasWebGPURenderer = Assert<'WebGPURenderer' extends keyof ThreeExports ? true : false>
type HasMeshElement = Assert<'mesh' extends keyof ThreeElements ? true : false>
type HasNodeMaterialElement = Assert<'meshBasicNodeMaterial' extends keyof ThreeElements ? true : false>
type HasPrimitive = Assert<'primitive' extends keyof ThreeElements ? true : false>

// The hooks are WebGPU-typed with nothing registered: WebGPU-only members need no cast
const hookRenderer: WebGPURenderer = useThree((s) => s.renderer)
void hookRenderer.compute
const narrowed: WebGPURootState = useThree()
useFrame((frameState) => void frameState.renderer.backend)
// ...and the narrowed state is still a RootState, so code annotated with the base type compiles
const asBase: RootState = narrowed
useFrame((frameState: RootState) => void frameState.camera)
// `gl` keeps the base type (deprecated; use `renderer`)
const gl: WebGLRenderer = useThree((s) => s.gl)

// RootState itself stays the base state, the renderer union (what packages augment, and what
// libraries that also run on /legacy type against)
declare const state: RootState
const renderer: WebGLRenderer | WebGPURenderer = state.renderer
// The support of the renderer this root loaded
const kind: 'webgl' | 'webgpu' = state.internal.support.kind
if (state.internal.support.kind === 'webgpu') {
  const target: typeof RenderTarget = state.internal.support.RenderTarget
  void target
}

// three's shared core is reachable from core code; renderer-specific classes are not
const three = getThree()
const vector = new three.Vector3()
// @ts-expect-error WebGLRenderer is not part of three's shared core
three.WebGLRenderer

// useRenderTarget hands back the WebGPU renderer's target
const fbo: RenderTarget = useRenderTarget()
// @ts-expect-error not a WebGLRenderTarget on this entry
const glFbo: WebGLRenderTarget = useRenderTarget()

// The ReactThreeFiber namespace carries this entry's element types
const mesh: ReactThreeFiber.ThreeElements['mesh'] = { position: [1, 2, 3] }

// Augmenting ThreeElements adds elements to this entry
declare module '../../packages/fiber/dist/index' {
  interface ThreeElements {
    customMesh: ReactThreeFiber.ThreeElement<ReactThreeFiber.ThreeExports['Mesh']>
  }
}
const customMesh: ReactThreeFiber.ThreeElements['customMesh'] = { position: [1, 2, 3] }

void [renderer, kind, vector, fbo, glFbo, mesh, customMesh, asBase, gl]

export type { HasMesh, HasWebGLRenderer, HasWebGPURenderer, HasMeshElement, HasNodeMaterialElement, HasPrimitive }
