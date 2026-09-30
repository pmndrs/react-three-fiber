// An app's view of @react-three/fiber/legacy, compiled against the built declarations.
import type { ReactThreeFiber, RootState, ThreeElements, ThreeExports } from '../../packages/fiber/dist/legacy'
import { Canvas, createRoot, useRenderTarget } from '../../packages/fiber/dist/legacy'
import { createElement } from 'react'
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

// scheduler works on every entry; renderer sharing (primary / share) is WebGPU-only
createElement(Canvas, { id: 'a', scheduler: { after: 'b', order: 1, fps: 30 }, gl: { shadows: 'soft' } })
// @ts-expect-error no `primary` on /legacy
createElement(Canvas, { primary: true })
// @ts-expect-error no `share` on /legacy
createElement(Canvas, { share: 'main' })
// @ts-expect-error shadows moved into the gl bag
createElement(Canvas, { shadows: true })
void createRoot(document.createElement('canvas')).configure({ scheduler: { fps: 30 }, gl: { shadows: true } })

export type { HasMesh, HasMeshElement, OmitsWebGPURenderer, OmitsNodeMaterialElement }
