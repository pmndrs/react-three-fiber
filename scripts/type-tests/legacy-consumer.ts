// An app's view of @react-three/fiber/legacy, compiled against the built declarations.
import type { ReactThreeFiber, RootState, ThreeElements, ThreeExports } from '../../packages/fiber/dist/legacy'
import { useRenderTarget } from '../../packages/fiber/dist/legacy'
import type { WebGLRenderer, WebGLRenderTarget } from 'three'

type Assert<T extends true> = T

// Only the `three` namespace: no WebGPU renderer, no node materials
type HasMesh = Assert<'Mesh' extends keyof ThreeExports ? true : false>
type OmitsWebGPURenderer = Assert<'WebGPURenderer' extends keyof ThreeExports ? false : true>
type HasMeshElement = Assert<'mesh' extends keyof ThreeElements ? true : false>
type OmitsNodeMaterialElement = Assert<'meshBasicNodeMaterial' extends keyof ThreeElements ? false : true>

declare const state: RootState

// Narrowed: this entry only ever constructs a WebGLRenderer
const renderer: WebGLRenderer = state.renderer
const fbo: WebGLRenderTarget = useRenderTarget(256)
const mesh: ReactThreeFiber.ThreeElements['mesh'] = { position: [1, 2, 3] }

void [renderer, fbo, mesh]

export type { HasMesh, HasMeshElement, OmitsWebGPURenderer, OmitsNodeMaterialElement }
