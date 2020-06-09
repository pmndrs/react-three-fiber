import React, { useMemo, useEffect } from 'react'
import { useThree } from 'react-three-fiber'
import * as THREE from 'three'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'
import { Line2 } from 'three/examples/jsm/lines/Line2'

interface Props {
  points: [number, number, number][]
  lineWidth?: number
  color?: THREE.Color | string | number
  vertexColors?: [number, number, number][]
  dashed?: boolean
}

function concat<T>(xs: T[][]) {
  return xs.reduce((acc, x) => acc.concat(x), [])
}

export default function Line({ lineWidth = 1, points, color = 'black', vertexColors, dashed }: Props) {
  const { size } = useThree()

  const colorArray = useMemo(
    () =>
      typeof color === 'number' ? color : typeof color === 'string' ? new THREE.Color(color).getHex() : color.getHex(),
    [color]
  )

  const matLine = useMemo(
    () =>
      new LineMaterial({
        color: colorArray,
        linewidth: lineWidth,
        vertexColors: Boolean(vertexColors),
        resolution: new THREE.Vector2(size.width, size.height),
        dashed,
      }),
    [color, lineWidth, vertexColors, size, dashed]
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

  return <primitive object={lineObj} dispose={null} />
}
