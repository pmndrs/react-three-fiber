import * as THREE from 'three'
import { UseBoundStore } from 'zustand'

import type { BaseInstance, LocalState, RootState } from '@react-three/fiber'

export type MockUseStoreState = UseBoundStore<RootState>

export interface MockInstance extends Omit<BaseInstance, '__r3f'> {
  __r3f: Omit<LocalState, 'root' | 'objects' | 'parent'> & {
    root: MockUseStoreState
    objects: MockSceneChild[]
    parent: MockInstance
  }
}

export interface MockSceneChild extends Omit<MockInstance, 'children'> {
  children: MockSceneChild[]
}

export interface MockScene extends Omit<THREE.Scene, 'children'>, Pick<MockInstance, '__r3f'> {
  children: MockSceneChild[]
}

export type CreateCanvasParameters = {
  beforeReturn?: (canvas: HTMLCanvasElement) => void
  width?: number
  height?: number
}

export interface Obj {
  [key: string]: any
}

/**
 * this is an empty object of any,
 * the data is passed to a new event
 * and subsequently passed to the
 * event handler you're calling
 */
export type MockEventData = {
  [key: string]: any
}

export interface TestInstanceChildOpts {
  exhaustive: boolean
}
