import { LOD, Object3D } from 'three'
import React, { forwardRef } from 'react'
import { useUpdate, useFrame } from 'react-three-fiber'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

type Props = JSX.IntrinsicElements['lOD'] & {
  children: React.ReactElement<Object3D>[]
  distances: number[]
}

export const Detailed = forwardRef(({ children, distances, ...props }: Props, ref) => {
  const lod = useUpdate<LOD>((lod) => {
    lod.levels.length = 0
    lod.children.forEach((object, index) => lod.levels.push({ object, distance: distances[index] }))
  }, [])
  useFrame((state) => lod.current?.update(state.camera))
  return (
    <lOD ref={mergeRefs([lod, ref])} {...props}>
      {children}
    </lOD>
  )
})
