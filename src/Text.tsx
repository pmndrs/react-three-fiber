import React, { Children, createElement, forwardRef, useMemo, useRef, useLayoutEffect, useState } from 'react'
// @ts-ignore
import { Text as TextMeshImpl } from 'troika-three-text'
import { extend, ReactThreeFiber } from 'react-three-fiber'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

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
  children: React.ReactNode
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

export const Text = forwardRef(({ anchorX = 'center', anchorY = 'middle', children, ...props }: Props, ref) => {
  const textRef = useRef<TextMeshImpl>()
  const [baseMtl, setBaseMtl] = useState()
  const [nodes, text] = useMemo(() => {
    let n: React.ReactNode[] = []
    let t = ''
    Children.forEach(children, (child) => {
      if (typeof child === 'string') t += child
      else if (child && typeof child === 'object' && (child as React.ReactElement).props.attach === 'material') {
        // Instantiate the base material and grab a reference to it, but don't assign any
        // props, and assign it as the `material`, which Troika will replace behind the scenes.
        n.push(createElement((child as React.ReactElement).type, { ref: setBaseMtl, attach: 'material' }))
        // Once the base material has been assigned, grab the resulting upgraded material,
        // and apply the original material props to that.
        if (baseMtl) {
          n.push(<primitive object={textRef.current.material} {...(child as React.ReactElement).props} attach={null} />)
        }
      } else n.push(child)
    })
    return [n, t]
  }, [children, baseMtl])
  useLayoutEffect(() => void textRef.current.sync())

  return (
    <textMeshImpl ref={mergeRefs([textRef, ref])} text={text} anchorX={anchorX} anchorY={anchorY} {...props}>
      {nodes}
    </textMeshImpl>
  )
})
