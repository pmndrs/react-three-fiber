import * as THREE from 'three'
import { useEffect, useRef } from 'react'
import { SubdivisionModifier } from 'three/examples/jsm/modifiers/SubdivisionModifier.js'

export function useSubdivision(subdivisions) {
  const ref = useRef<THREE.Mesh>()
  const original = useRef<THREE.BufferGeometry | THREE.Geometry>()
  const modifier = useRef<SubdivisionModifier>()

  useEffect(() => {
    if (!original.current) {
      original.current = ref.current!.geometry.clone()
      modifier.current = new SubdivisionModifier(parseInt(subdivisions))
    }
  }, [subdivisions])

  useEffect(() => {
    modifier.current!.subdivisions = subdivisions
  }, [subdivisions])

  useEffect(() => {
    if (original.current && ref.current) {
      const bufferGeometry = new THREE.BufferGeometry()
      const subdivided = bufferGeometry.fromGeometry(modifier.current!.modify(original.current))
      ref.current.geometry = subdivided
    }
  }, [subdivisions])

  return ref
}
