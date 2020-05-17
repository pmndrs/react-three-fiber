import React, { forwardRef } from 'react'
// @ts-ignore
import { TextMesh as TextMeshImpl } from 'troika-3d-text/dist/textmesh-standalone.esm'
import { extend, ReactThreeFiber } from 'react-three-fiber'

extend({ TextMeshImpl })

type TextMesh = ReactThreeFiber.Object3DNode<TextMeshImpl, typeof TextMeshImpl>

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/interface-name-prefix
    interface IntrinsicElements {
      textMeshImpl: TextMesh
    }
  }
}

type Props = JSX.IntrinsicElements['mesh'] & {
  children: string
  color?: ReactThreeFiber.Color
  fontSize?: number
  maxWidth?: number
  lineHeight?: number
  letterSpacing?: number
  textAlign?: 'left' | 'right' | 'center' | 'justify'
  font?: string
  anchorX?: number | 'left' | 'center' | 'right'
  anchorY?: number | 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom'
  clipRect?: [number, number, number, number]
  depthOffset?: number
  overflowWrap?: 'normal' | 'break-word'
  whiteSpace?: 'normal' | 'overflowWrap' | 'overflowWrap'
}

export const Text = forwardRef(({ children, ...props }: Props, ref) => {
  return <textMeshImpl ref={ref} text={children} {...props} />
})
