import type { ReactThreeFiber, RootState, ThreeElements, ThreeExports } from '../../packages/fiber/dist/index'
import type { WebGLRenderer } from 'three'
import type { WebGPURenderer } from 'three/webgpu'

type Assert<T extends true> = T

type HasMesh = Assert<'Mesh' extends keyof ThreeExports ? true : false>
type HasWebGPURenderer = Assert<'WebGPURenderer' extends keyof ThreeExports ? true : false>
type HasMeshElement = Assert<'mesh' extends keyof ThreeElements ? true : false>

declare module '../../packages/fiber/dist/index' {
  interface ThreeElements {
    customMesh: ReactThreeFiber.ThreeElement<ReactThreeFiber.ThreeExports['Mesh']>
  }
}
const customMesh: ReactThreeFiber.ThreeElements['customMesh'] = { position: [1, 2, 3] }
void customMesh

declare const state: RootState

const renderer: WebGLRenderer | WebGPURenderer = state.renderer

void renderer

export type { HasMesh, HasMeshElement, HasWebGPURenderer }
