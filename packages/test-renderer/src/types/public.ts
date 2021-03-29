import type { Camera, RenderProps } from '@react-three/fiber'

import { ReactThreeTestInstance } from '../createTestInstance'

import type { MockEventData, CreateCanvasParameters } from './internal'

export type MockSyntheticEvent = {
  camera: Camera
  stopPropagation: () => void
  target: ReactThreeTestInstance
  currentTarget: ReactThreeTestInstance
  sourceEvent: MockEventData
  [key: string]: any
}

export type CreateOptions = CreateCanvasParameters & RenderProps<HTMLCanvasElement>

export type Act = (cb: () => Promise<any>) => Promise<any>

export type Renderer = {
  scene: ReactThreeTestInstance
  unmount: () => Promise<void>
  getInstance: () => null | unknown
  update: (el: React.ReactNode) => Promise<void>
  toTree: () => Tree | undefined
  toGraph: () => SceneGraph | undefined
  fireEvent: (element: ReactThreeTestInstance, handler: string, data?: MockEventData) => Promise<any>
  advanceFrames: (frames: number, delta: number | number[]) => Promise<void>
}

export interface SceneGraphItem {
  type: string
  name: string
  children: SceneGraphItem[] | null
}

export type SceneGraph = SceneGraphItem[]

export interface TreeNode {
  type: string
  props: {
    [key: string]: any
  }
  children: TreeNode[]
}

export type Tree = TreeNode[]
