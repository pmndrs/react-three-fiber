import {
  useRenderTarget,
  type ReactThreeFiber,
  type RootState,
  type ThreeElements,
  type ThreeExports,
} from '../../packages/fiber/dist/legacy'
import type { WebGLRenderer } from 'three'

type Assert<T extends true> = T

type HasMesh = Assert<'Mesh' extends keyof ThreeExports ? true : false>
type OmitsWebGPURenderer = Assert<'WebGPURenderer' extends keyof ThreeExports ? false : true>
type HasMeshElement = Assert<'mesh' extends keyof ThreeElements ? true : false>
const mesh: ReactThreeFiber.ThreeElements['mesh'] = { position: [1, 2, 3] }
void mesh

function useRenderTargetAssertions(gl: WebGLRenderer) {
  gl.setRenderTarget(useRenderTarget())
  gl.setRenderTarget(useRenderTarget(256))
  gl.setRenderTarget(useRenderTarget(256, 128))
}
void useRenderTargetAssertions

declare const state: RootState

const renderer: WebGLRenderer = state.renderer

void renderer

export type { HasMesh, HasMeshElement, OmitsWebGPURenderer }
