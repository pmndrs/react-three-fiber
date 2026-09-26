import { createStore as createFiberStore, context } from '@react-three/fiber'
import { createResourceState } from '../src/internal/tslExtension'

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
