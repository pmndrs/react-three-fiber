import React, { forwardRef, useMemo } from 'react'
import { Mesh, Shape, ExtrudeBufferGeometry } from 'three'
import { useUpdate } from 'react-three-fiber'
import { NamedArrayTuple } from 'ts-utils'

const eps = 0.00001

function createShape(width: number, height: number, radius0: number) {
  const shape = new Shape()
  const radius = radius0 - eps
  shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true)
  shape.absarc(eps, height - radius * 2, eps, Math.PI, Math.PI / 2, true)
  shape.absarc(width - radius * 2, height - radius * 2, eps, Math.PI / 2, 0, true)
  shape.absarc(width - radius * 2, eps, eps, 0, -Math.PI / 2, true)
  return shape
}

type Props = {
  args?: NamedArrayTuple<(width?: number, height?: number, depth?: number) => void>
  radius?: number
  smoothness?: number
} & Omit<JSX.IntrinsicElements['mesh'], 'args'>

export const RoundedBox = forwardRef<Mesh, Props>(function RoundedBox(
  { args: [width = 1, height = 1, depth = 1] = [], radius = 0.05, smoothness = 4, children, ...rest },
  ref
) {
  const shape = useMemo(() => createShape(width, height, radius), [width, height, radius])
  const params = useMemo(
    () => ({
      depth: depth - radius * 2,
      bevelEnabled: true,
      bevelSegments: smoothness * 2,
      steps: 1,
      bevelSize: radius - eps,
      bevelThickness: radius,
      curveSegments: smoothness,
    }),
    [depth, radius, smoothness]
  )
  const geomRef = useUpdate<ExtrudeBufferGeometry>((geometry) => void geometry.center(), [shape, params])
  return (
    <mesh ref={ref as React.MutableRefObject<Mesh>} {...rest}>
      <extrudeBufferGeometry attach="geometry" ref={geomRef} args={[shape, params]} />
      {children}
    </mesh>
  )
})
