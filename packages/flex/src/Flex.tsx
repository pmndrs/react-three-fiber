import React, { useLayoutEffect, useMemo, useCallback, PropsWithChildren, useRef } from 'react'
import Yoga, { YogaNode } from 'yoga-layout-prebuilt'
import { Vector3, Group, Box3 } from 'three'
import { useFrame, useThree, ReactThreeFiber } from 'react-three-fiber'

import { setYogaProperties, rmUndefFromObj, vectorFromObject, Axis, getDepthAxis, getFlex2DSize } from './util'
import { boxContext, flexContext, SharedFlexContext, SharedBoxContext } from './context'
import type { R3FlexProps, FlexYogaDirection, FlexPlane } from './props'

type FlexProps = PropsWithChildren<
  Partial<{
    /**
     * Root container position
     */
    size: [number, number, number]
    yogaDirection: FlexYogaDirection
    plane: FlexPlane
    scaleFactor?: number
    onReflow?: (totalWidth: number, totalHeight: number) => void
  }> &
    R3FlexProps &
    Omit<ReactThreeFiber.Object3DNode<THREE.Group, typeof Group>, 'children'>
>

/**
 * Flex container. Can contain Boxes
 */
export function Flex({
  // Non flex props
  size = [1, 1, 1],
  yogaDirection = 'ltr',
  plane = 'xy',
  children,
  scaleFactor = 100,
  onReflow,

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
}: FlexProps) {
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

  // Keeps track of the yoga nodes of the children and the related wrapper groups
  const boxesRef = useRef<{ node: YogaNode; group: Group; flexProps: R3FlexProps; centerAnchor: boolean }[]>([])
  const registerBox = useCallback(
    (node: YogaNode, group: Group, flexProps: R3FlexProps, centerAnchor: boolean = false) => {
      const i = boxesRef.current.findIndex((b) => b.node === node)
      if (i !== -1) {
        boxesRef.current.splice(i, 1)
      }
      boxesRef.current.push({ group, node, flexProps, centerAnchor })
    },
    []
  )
  const unregisterBox = useCallback((node: YogaNode) => {
    const i = boxesRef.current.findIndex((b) => b.node === node)
    if (i !== -1) {
      boxesRef.current.splice(i, 1)
    }
  }, [])

  // Reference to the yoga native node
  const node = useMemo(() => Yoga.Node.create(), [])
  useLayoutEffect(() => {
    setYogaProperties(node, flexProps, scaleFactor)
  }, [node, flexProps, scaleFactor])

  // Mechanism for invalidating and recalculating layout
  const { invalidate } = useThree()
  const dirtyRef = useRef(true)
  const requestReflow = useCallback(() => {
    dirtyRef.current = true
    invalidate()
  }, [invalidate])

  // We need to reflow everything if flex props changes
  useLayoutEffect(() => {
    requestReflow()
  }, [children, flexProps, requestReflow])

  // Common variables for reflow
  const boundingBox = useMemo(() => new Box3(), [])
  const vec = useMemo(() => new Vector3(), [])
  const mainAxis = plane[0] as Axis
  const crossAxis = plane[1] as Axis
  const depthAxis = getDepthAxis(plane)
  const [flexWidth, flexHeight] = getFlex2DSize(size, plane)
  const yogaDirection_ =
    yogaDirection === 'ltr' ? Yoga.DIRECTION_LTR : yogaDirection === 'rtl' ? Yoga.DIRECTION_RTL : yogaDirection

  // Shared context for flex and box
  const sharedFlexContext = useMemo<SharedFlexContext>(
    () => ({
      requestReflow,
      registerBox,
      unregisterBox,
      scaleFactor,
    }),
    [requestReflow, registerBox, unregisterBox, scaleFactor]
  )
  const sharedBoxContext = useMemo<SharedBoxContext>(() => ({ node, size: [flexWidth, flexHeight] }), [
    node,
    flexWidth,
    flexHeight,
  ])

  // Handles the reflow procedure
  function reflow() {
    // Recalc all the sizes
    boxesRef.current.forEach(({ group, node, flexProps }) => {
      const scaledWidth = typeof flexProps.width === 'number' ? flexProps.width * scaleFactor : flexProps.width
      const scaledHeight = typeof flexProps.height === 'number' ? flexProps.height * scaleFactor : flexProps.height

      if (scaledWidth !== undefined && scaledHeight !== undefined) {
        // Forced size, no need to calculate bounding box
        node.setWidth(scaledWidth)
        node.setHeight(scaledHeight)
      } else {
        // No size specified, calculate bounding box
        boundingBox.setFromObject(group).getSize(vec)
        node.setWidth(scaledWidth || vec[mainAxis] * scaleFactor)
        node.setHeight(scaledHeight || vec[crossAxis] * scaleFactor)
      }
    })

    // Perform yoga layout calculation
    node.calculateLayout(flexWidth * scaleFactor, flexHeight * scaleFactor, yogaDirection_)

    let minX = 0
    let maxX = 0
    let minY = 0
    let maxY = 0

    // Reposition after recalculation
    boxesRef.current.forEach(({ group, node, centerAnchor }) => {
      const { left, top, width, height } = node.getComputedLayout()
      const position = vectorFromObject({
        [mainAxis]: (left + (centerAnchor ? width / 2 : 0)) / scaleFactor,
        [crossAxis]: -(top + (centerAnchor ? height / 2 : 0)) / scaleFactor,
        [depthAxis]: 0,
      } as any)
      minX = Math.min(minX, left)
      minY = Math.min(minY, top)
      maxX = Math.max(maxX, left + width)
      maxY = Math.max(maxY, top + height)
      group.position.copy(position)
    })

    // Call the reflow event to update resulting size
    onReflow && onReflow((maxX - minX) / scaleFactor, (maxY - minY) / scaleFactor)

    // Ask react-three-fiber to perform a render (invalidateFrameLoop)
    invalidate()
  }

  // We check if we have to reflow every frame
  // This way we can batch the reflow if we have multiple reflow requests
  useFrame(() => {
    if (dirtyRef.current) {
      dirtyRef.current = false
      reflow()
    }
  })

  return (
    <group {...props}>
      <flexContext.Provider value={sharedFlexContext}>
        <boxContext.Provider value={sharedBoxContext}>{children}</boxContext.Provider>
      </flexContext.Provider>
    </group>
  )
}
