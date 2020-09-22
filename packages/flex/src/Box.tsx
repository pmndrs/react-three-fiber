import React, { useLayoutEffect, useRef, useMemo, useState } from 'react'
import * as THREE from 'three'
import Yoga from 'yoga-layout-prebuilt'
import { ReactThreeFiber, useFrame } from 'react-three-fiber'

import { setYogaProperties, rmUndefFromObj } from './util'
import { boxContext, flexContext } from './context'
import { R3FlexProps } from './props'
import { useReflow, useContext } from './hooks'

/**
 * Box container for 3D Objects.
 * For containing Boxes use `<Flex />`.
 */
export function Box({
  // Non-flex props
  children,
  centerAnchor,

  // flex props
  flexDirection,
  flexDir,
  dir,

  alignContent,
  alignItems,
  alignSelf,
  align,

  justifyContent,
  justify,

  flexBasis,
  basis,
  flexGrow,
  grow,

  flexShrink,
  shrink,

  flexWrap,
  wrap,

  margin,
  m,
  marginBottom,
  marginLeft,
  marginRight,
  marginTop,
  mb,
  ml,
  mr,
  mt,

  padding,
  p,
  paddingBottom,
  paddingLeft,
  paddingRight,
  paddingTop,
  pb,
  pl,
  pr,
  pt,

  height,
  width,

  maxHeight,
  maxWidth,
  minHeight,
  minWidth,

  // other
  ...props
}: {
  centerAnchor?: boolean
  children: React.ReactNode | ((width: number, height: number) => React.ReactNode)
} & R3FlexProps &
  Omit<ReactThreeFiber.Object3DNode<THREE.Group, typeof THREE.Group>, 'children'>) {
  // must memoize or the object literal will cause every dependent of flexProps to rerender everytime
  const flexProps: R3FlexProps = useMemo(() => {
    const _flexProps = {
      flexDirection,
      flexDir,
      dir,

      alignContent,
      alignItems,
      alignSelf,
      align,

      justifyContent,
      justify,

      flexBasis,
      basis,
      flexGrow,
      grow,
      flexShrink,
      shrink,

      flexWrap,
      wrap,

      margin,
      m,
      marginBottom,
      marginLeft,
      marginRight,
      marginTop,
      mb,
      ml,
      mr,
      mt,

      padding,
      p,
      paddingBottom,
      paddingLeft,
      paddingRight,
      paddingTop,
      pb,
      pl,
      pr,
      pt,

      height,
      width,

      maxHeight,
      maxWidth,
      minHeight,
      minWidth,
    }

    rmUndefFromObj(_flexProps)
    return _flexProps
  }, [
    align,
    alignContent,
    alignItems,
    alignSelf,
    dir,
    flexBasis,
    basis,
    flexDir,
    flexDirection,
    flexGrow,
    grow,
    flexShrink,
    shrink,
    flexWrap,
    height,
    justify,
    justifyContent,
    m,
    margin,
    marginBottom,
    marginLeft,
    marginRight,
    marginTop,
    maxHeight,
    maxWidth,
    mb,
    minHeight,
    minWidth,
    ml,
    mr,
    mt,
    p,
    padding,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingTop,
    pb,
    pl,
    pr,
    pt,
    width,
    wrap,
  ])

  const { registerBox, unregisterBox, scaleFactor } = useContext(flexContext)
  const { node: parent } = useContext(boxContext)
  const group = useRef<THREE.Group>()
  const node = useMemo(() => Yoga.Node.create(), [])
  const reflow = useReflow()

  useLayoutEffect(() => {
    setYogaProperties(node, flexProps, scaleFactor)
  }, [flexProps, node, scaleFactor])

  // Make child known to the parents yoga instance *before* it calculates layout
  useLayoutEffect(() => {
    if (!group.current || !parent) return

    parent.insertChild(node, parent.getChildCount())
    registerBox(node, group.current, flexProps, centerAnchor)

    // Remove child on unmount
    return () => {
      parent.removeChild(node)
      unregisterBox(node)
    }
  }, [node, parent, flexProps, centerAnchor, registerBox, unregisterBox])

  // We need to reflow if props change
  useLayoutEffect(() => {
    reflow()
  }, [children, flexProps, reflow])

  const [size, setSize] = useState<[number, number]>([0, 0])
  const epsilon = 1 / scaleFactor
  useFrame(() => {
    const width =
      (typeof flexProps.width === 'number' ? flexProps.width : null) || node.getComputedWidth().valueOf() / scaleFactor
    const height =
      (typeof flexProps.height === 'number' ? flexProps.height : null) ||
      node.getComputedHeight().valueOf() / scaleFactor

    if (Math.abs(width - size[0]) > epsilon || Math.abs(height - size[1]) > epsilon) {
      setSize([width, height])
    }
  })

  const sharedBoxContext = useMemo(() => ({ node, size }), [node, size])

  return (
    <group ref={group} {...props}>
      <boxContext.Provider value={sharedBoxContext}>
        {typeof children === 'function' ? children(size[0], size[1]) : children}
      </boxContext.Provider>
    </group>
  )
}
