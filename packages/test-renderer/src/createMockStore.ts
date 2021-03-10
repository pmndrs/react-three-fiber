import * as THREE from 'three'
import { UseStore } from 'zustand'
import { context, createStore } from 'react-three-fiber'
import type { Instance, LocalState } from 'react-three-fiber/src/core/renderer'
import type { RootState } from 'react-three-fiber/src/core/store'

export type MockUseStoreState = UseStore<RootState>

export type MockInstance = Omit<Instance, '__r3f'> & {
  __r3f: Omit<LocalState, 'root' | 'objects'> & {
    root: MockUseStoreState
    objects: MockSceneChild[]
  }
}

export type MockSceneChild = Omit<THREE.Object3D, 'children'> &
  MockInstance & {
    children: MockSceneChild[]
  }

export type MockScene = Omit<THREE.Scene, 'children'> &
  MockInstance & {
    children: MockSceneChild[]
  }

export { createStore, context }
