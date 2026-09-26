import { useRef, useImperativeHandle, useMemo } from 'react'
import { buildGraph } from '../utils'
import { Object3D } from '#three'

//* Type Imports ==============================
import type { Instance, ObjectMap } from '#types'

// export other hooks
export * from './useStore'
export * from './useLoader'
export * from './useFrame'
export * from './useTexture'
export * from './useTextures'
export * from './useRenderTarget'
export * from './useEnvironment'

/**
 * Exposes an object's {@link Instance}.
 * @see https://docs.pmnd.rs/react-three-fiber/api/additional-exports#useInstanceHandle
 *
 * **Note**: this is an escape hatch to react-internal fields. Expect this to change significantly between versions.
 */
export function useInstanceHandle<T>(ref: React.RefObject<T>): React.RefObject<Instance<T>> {
  const instance = useRef<Instance>(null!)
  useImperativeHandle(instance, () => (ref.current as unknown as Instance<T>['object']).__r3f!, [ref])
  return instance
}

/**
 * Returns a node graph of an object with named nodes & materials.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usegraph
 */
export function useGraph(object: Object3D): ObjectMap {
  return useMemo(() => buildGraph(object), [object])
}
