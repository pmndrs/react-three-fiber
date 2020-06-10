import * as THREE from 'three'
import React, { useMemo, useEffect, useRef } from 'react'
import { extend, ReactThreeFiber } from 'react-three-fiber'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry'
import { LineMaterial, LineMaterialParameters } from 'three/examples/jsm/lines/LineMaterial'
import { Line2 } from 'three/examples/jsm/lines/Line2'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

extend({ Line2, LineGeometry, LineMaterial })

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      line2: ReactThreeFiber.Object3DNode<Line2, typeof Line2>
      lineGeometry: ReactThreeFiber.Object3DNode<LineGeometry, typeof LineGeometry>
      lineMaterial: ReactThreeFiber.MaterialNode<LineMaterial, [LineMaterialParameters]>
    }
  }
}

type Props = {
  points: [number, number, number][]
  color?: THREE.Color | string | number
  vertexColors?: [number, number, number][]
} & Omit<JSX.IntrinsicElements['line2'], 'args'> &
  Omit<JSX.IntrinsicElements['lineMaterial'], 'color' | 'vertexColors' | 'resolution' | 'args'>

export const Line = React.forwardRef<Line2, Props>(function Line(
  { points, color = 'black', vertexColors, ...rest },
  ref
) {
  const lineRef = useRef<Line2>()
  const geomRef = useRef<LineGeometry>()
  const resolution = useMemo(() => new THREE.Vector2(512, 512), [])
  useEffect(() => {
    if (!geomRef.current || !lineRef.current) return
    geomRef.current.setPositions(points.flat())
    if (vertexColors) geomRef.current.setColors(vertexColors.flat())
    lineRef.current.computeLineDistances()
  }, [points, vertexColors])
  return (
    <line2 ref={mergeRefs([lineRef, ref])} {...rest}>
      <lineGeometry attach="geometry" ref={geomRef} />
      <lineMaterial
        attach="material"
        color={color}
        vertexColors={Boolean(vertexColors)}
        resolution={resolution}
        {...rest}
      />
    </line2>
  )
})
