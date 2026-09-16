import type { RootState, ThreeElements, ThreeExports } from '../../packages/fiber/dist/index'
import type { WebGLRenderer } from 'three'
import type { WebGPURenderer } from 'three/webgpu'

type Assert<T extends true> = T

type HasMesh = Assert<'Mesh' extends keyof ThreeExports ? true : false>
type HasWebGPURenderer = Assert<'WebGPURenderer' extends keyof ThreeExports ? true : false>
type HasMeshElement = Assert<'mesh' extends keyof ThreeElements ? true : false>

declare const state: RootState

const renderer: WebGLRenderer | WebGPURenderer = state.renderer

void renderer

export type { HasMesh, HasMeshElement, HasWebGPURenderer }
