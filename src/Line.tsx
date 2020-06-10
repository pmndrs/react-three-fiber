import React, { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { extend, useThree, ReactThreeFiber } from 'react-three-fiber'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'
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
      lineMaterial: ReactThreeFiber.Object3DNode<LineMaterial, typeof LineMaterial>
    }
  }
}

type Props = {
  points: [number, number, number][]
  color?: THREE.Color | string | number
  vertexColors?: [number, number, number][]
} & Omit<JSX.IntrinsicElements['line2'], 'args'> &
  Omit<JSX.IntrinsicElements['lineMaterial'], 'color' | 'vertexColors' | 'resolution' | 'args'>

function concat<T>(xs: T[][]) {
  return xs.reduce((acc, x) => acc.concat(x), [])
}

const white = new THREE.Color('white')

export default React.forwardRef<Line2, Props>(function Line({ points, color = 'white', vertexColors, ...rest }, ref) {
  const { size } = useThree()

  const colorThree = useMemo(
    () =>
      typeof color === 'number' ? new THREE.Color(color) : typeof color === 'string' ? new THREE.Color(color) : color,
    [color]
  )

  const lineRef = useRef<Line2>()
  const geomRef = useRef<LineGeometry>()

  useEffect(() => {
    if (!geomRef.current || !lineRef.current) return

    const pointsFlat = concat(points)
    geomRef.current.setPositions(pointsFlat)

    if (vertexColors) {
      const colorsFlat = concat(vertexColors)
      geomRef.current.setColors(colorsFlat)
    }

    lineRef.current.computeLineDistances()
  }, [points, vertexColors])

  return (
    <line2 ref={mergeRefs([lineRef, ref])} {...rest}>
      <lineGeometry attach="geometry" ref={geomRef} />
      <lineMaterial
        attach="material"
        color={Boolean(vertexColors) ? white : colorThree}
        vertexColors={Boolean(vertexColors)}
        resolution={new THREE.Vector2(size.width, size.height)}
        {...rest}
      />
    </line2>
  )
})
