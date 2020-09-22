import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier'

export function useSimplification(simplePercent: number) {
  const ref = useRef<THREE.Mesh>()
  const original = useRef<THREE.BufferGeometry | THREE.Geometry>()
  const modifier = useRef<SimplifyModifier>()

  useEffect(() => {
    if (!original.current) {
      original.current = ref.current!.geometry.clone()
      modifier.current = new SimplifyModifier()
    }
  }, [])

  useEffect(() => {
    if (original.current && ref.current) {
      let geometry = new THREE.BufferGeometry()

      if (original.current instanceof THREE.BufferGeometry) {
        geometry = original.current.clone()
      } else {
        geometry = geometry.fromGeometry(original.current)
      }

      const count = Math.floor(geometry.attributes.position.count * simplePercent) // number of vertices to remove
      ref.current.geometry = modifier.current!.modify(geometry, count)
    }
  }, [simplePercent])

  return ref
}
