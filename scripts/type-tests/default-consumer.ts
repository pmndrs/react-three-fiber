// An app's view of @react-three/fiber, compiled against the built declarations with skipLibCheck off.
import type { ReactThreeFiber, RootState, ThreeElements, ThreeExports } from '../../packages/fiber/dist/index'
import { getThree, useRenderTarget } from '../../packages/fiber/dist/index'
import type { WebGLRenderer, WebGLRenderTarget } from 'three'
import type { WebGPURenderer, RenderTarget } from 'three/webgpu'

type Assert<T extends true> = T

// The root entry can construct either renderer, so its JSX map is the union of both namespaces
type HasMesh = Assert<'Mesh' extends keyof ThreeExports ? true : false>
type HasWebGLRenderer = Assert<'WebGLRenderer' extends keyof ThreeExports ? true : false>
type HasWebGPURenderer = Assert<'WebGPURenderer' extends keyof ThreeExports ? true : false>
type HasMeshElement = Assert<'mesh' extends keyof ThreeElements ? true : false>
type HasNodeMaterialElement = Assert<'meshBasicNodeMaterial' extends keyof ThreeElements ? true : false>
type HasPrimitive = Assert<'primitive' extends keyof ThreeElements ? true : false>

declare const state: RootState

// Either renderer at runtime, so the union
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

// useRenderTarget hands back whichever target matches the renderer
const fbo: WebGLRenderTarget | RenderTarget = useRenderTarget()

// The ReactThreeFiber namespace carries this entry's element types
const mesh: ReactThreeFiber.ThreeElements['mesh'] = { position: [1, 2, 3] }

// Augmenting ThreeElements adds elements to this entry
declare module '../../packages/fiber/dist/index' {
  interface ThreeElements {
    customMesh: ReactThreeFiber.ThreeElement<ReactThreeFiber.ThreeExports['Mesh']>
  }
}
const customMesh: ReactThreeFiber.ThreeElements['customMesh'] = { position: [1, 2, 3] }

void [renderer, kind, vector, fbo, mesh, customMesh]

export type { HasMesh, HasWebGLRenderer, HasWebGPURenderer, HasMeshElement, HasNodeMaterialElement, HasPrimitive }
