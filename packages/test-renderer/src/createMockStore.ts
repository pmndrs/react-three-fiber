import * as THREE from 'three'
import * as React from 'react'
import create, { GetState, SetState, UseStore } from 'zustand'
import shallow from 'zustand/shallow'

import { Instance, InstanceProps, LocalState } from 'react-three-fiber/src/core/renderer'
import {
  isOrthographicCamera,
  RootState,
  StoreProps,
  InternalState,
  createCommonStore,
} from 'react-three-fiber/src/core/store'

type MockRootState = Omit<RootState, 'gl' | 'scene' | 'onCreated' | 'internal' | 'set' | 'get'> & {
  gl: {}
  scene: MockScene
  internal: Omit<InternalState, 'set' | 'lastProps'> & {
    set: SetState<MockRootState>
    lastProps: MockStoreProps
  }
  set: SetState<MockRootState>
  get: GetState<MockRootState>
  onCreated?: (props: MockRootState) => Promise<any> | void
}

export type MockStoreProps = Omit<StoreProps, 'onCreated' | 'gl'> & {
  onCreated?: (props: MockRootState) => Promise<any> | void
  gl: {}
}

export type MockUseStoreState = UseStore<MockRootState>

type MockInstance = Omit<Instance, '__r3f'> & {
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

const context = React.createContext<MockUseStoreState>({} as MockUseStoreState)

const createMockStore = (
  applyProps: (instance: Instance, newProps: InstanceProps, oldProps?: InstanceProps, accumulative?: boolean) => void,
  props: MockStoreProps,
): MockUseStoreState => {
  const { size, onCreated } = props

  // @ts-ignore
  const rootState = create<MockRootState>((set, get) => {
    return {
      gl: {},
      onCreated,
      set,
      get,
      invalidate: (frames?: number) => {},
      //@ts-ignore
      ...createCommonStore(props, applyProps, get, set),
    }
  })

  // Resize camera and renderer on changes to size and pixelratio
  rootState.subscribe(
    () => {
      const { camera, size, viewport, internal } = rootState.getState()
      // https://github.com/pmndrs/react-three-fiber/issues/92
      // Do not mess with the camera if it belongs to the user
      if (!(internal.lastProps.camera instanceof THREE.Camera)) {
        if (isOrthographicCamera(camera)) {
          camera.left = size.width / -2
          camera.right = size.width / 2
          camera.top = size.height / 2
          camera.bottom = size.height / -2
        } else {
          camera.aspect = size.width / size.height
        }
        camera.updateProjectionMatrix()
        // https://github.com/pmndrs/react-three-fiber/issues/178
        // Update matrix world since the renderer is a frame late
        camera.updateMatrixWorld()
      }
    },
    (state) => [state.viewport.dpr, state.size],
    shallow,
  )

  const state = rootState.getState()
  // Update size
  if (size) {
    state.setSize(size.width, size.height)
  }

  // Return root state
  return rootState
}

export { createMockStore, context }
