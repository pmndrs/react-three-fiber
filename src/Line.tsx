import React, { useMemo, useEffect } from 'react'
import { useThree } from 'react-three-fiber'
import * as THREE from 'three'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry'
import { LineMaterial, LineMaterialParameters } from 'three/examples/jsm/lines/LineMaterial'
import { Line2 } from 'three/examples/jsm/lines/Line2'

type Props = {
  points: [number, number, number][]
  lineWidth?: number
  color?: THREE.Color | string | number
  vertexColors?: [number, number, number][]
  dashed?: boolean
} & JSX.IntrinsicElements['mesh'] &
  Omit<LineMaterialParameters, 'color' | 'linewidth' | 'vertexColors' | 'resolution' | 'dashed'>

function concat<T>(xs: T[][]) {
  return xs.reduce((acc, x) => acc.concat(x), [])
}

export default React.forwardRef<Line2, Props>(function Line(
  { lineWidth = 1, points, color = 'black', vertexColors, dashed, ...rest },
  ref
) {
  const { size } = useThree()

  const colorArray = useMemo(
    () =>
      typeof color === 'number' ? color : typeof color === 'string' ? new THREE.Color(color).getHex() : color.getHex(),
    [color]
  )

  const matLine = useMemo(
    () =>
      new LineMaterial({
        color: Boolean(vertexColors) ? 0xffffff : colorArray,
        linewidth: lineWidth,
        vertexColors: Boolean(vertexColors),
        resolution: new THREE.Vector2(size.width, size.height),
        dashed: Boolean(dashed),
        ...rest,
      }),
    [colorArray, lineWidth, vertexColors, size, dashed, rest]
  )

  const geometry = useMemo(() => new LineGeometry(), [])
  const lineObj = useMemo(() => new Line2(geometry, matLine), [geometry, matLine])

  useEffect(() => {
    const pointsFlat = concat(points)
    geometry.setPositions(pointsFlat)

    if (vertexColors) {
      const colorsFlat = concat(vertexColors)
      geometry.setColors(colorsFlat)
    }

    lineObj.computeLineDistances()
  }, [points, geometry, vertexColors, lineObj])

  return <primitive ref={ref} object={lineObj} dispose={null} {...rest} />
})
