import * as THREE from 'three/webgpu'
import { createStore as createFiberStore, context } from '@react-three/fiber'
import { registerThree } from '../../fiber/src/core/three'
import { createResourceState } from '../src/internal/tslExtension'

// A bare store never goes through configure(), which is what loads three's classes for a root.
registerThree(THREE)

/**
 * A bare RootStore carrying the TSL fields, as the root extension sets them up on a configured
 * root. For tests that render hooks under `context.Provider` without createRoot/configure.
 */
export function createStore(...args: Parameters<typeof createFiberStore>) {
  const store = createFiberStore(...args)
  store.setState(createResourceState())
  return store
}

export { context }
