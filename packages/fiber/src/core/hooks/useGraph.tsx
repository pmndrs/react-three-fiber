import * as THREE from 'three'
import * as React from 'react'
import { buildGraph, ObjectMap } from '../utils'

/**
 * Returns a node graph of an object with named nodes & materials.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usegraph
 */
export function useGraph(object: THREE.Object3D): ObjectMap {
  return React.useMemo(() => buildGraph(object), [object])
}
