import type { ReactThreeFiber, RootState, ThreeElements, ThreeExports } from '../../packages/fiber/dist/legacy'
import type { WebGLRenderer } from 'three'

type Assert<T extends true> = T

type HasMesh = Assert<'Mesh' extends keyof ThreeExports ? true : false>
type OmitsWebGPURenderer = Assert<'WebGPURenderer' extends keyof ThreeExports ? false : true>
type HasMeshElement = Assert<'mesh' extends keyof ThreeElements ? true : false>
const mesh: ReactThreeFiber.ThreeElements['mesh'] = { position: [1, 2, 3] }
void mesh

declare const state: RootState

const renderer: WebGLRenderer = state.renderer

void renderer

export type { HasMesh, HasMeshElement, OmitsWebGPURenderer }
