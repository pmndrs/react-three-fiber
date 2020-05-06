import { Mesh, Color } from 'three'
import React, { forwardRef, useMemo } from 'react'

type Props = JSX.IntrinsicElements['mesh'] & {
  colorStop?: number
  fog?: boolean
  color?: Color | number | string
  opacity?: number
}

export const Shadow = forwardRef(
  ({ fog = false, colorStop = 0.0, color = 'black', opacity = 0.5, ...props }: Props, ref) => {
    const canvas = useMemo(() => {
      let canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      let context = canvas.getContext('2d') as CanvasRenderingContext2D
      let gradient = context.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2
      )
      gradient.addColorStop(colorStop, new Color(color).getStyle())
      gradient.addColorStop(1, 'rgba(0,0,0,0)')
      context.fillStyle = gradient
      context.fillRect(0, 0, canvas.width, canvas.height)
      return canvas
    }, [color, stop])
    return (
      <mesh ref={ref as React.MutableRefObject<Mesh>} {...props}>
        <planeBufferGeometry attach="geometry" args={[1, 1]} />
        <meshBasicMaterial attach="material" transparent opacity={opacity} fog={fog}>
          <canvasTexture attach="map" args={[canvas]} />
        </meshBasicMaterial>
      </mesh>
    )
  }
)
