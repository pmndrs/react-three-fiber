import { YogaFlexDirection, YogaAlign, YogaJustifyContent, YogaFlexWrap, YogaDirection } from 'yoga-layout-prebuilt'

export type FlexYogaDirection = YogaDirection | 'ltr' | 'rtl'
export type FlexPlane = 'xy' | 'yz' | 'xz'

export type Value = string | number

export type FlexDirection = YogaFlexDirection | 'row' | 'column' | 'row-reverse' | 'column-reverse'

export type JustifyContent =
  | YogaJustifyContent
  | 'center'
  | 'flex-end'
  | 'flex-start'
  | 'space-between'
  | 'space-evenly'
  | 'space-around'

export type Align =
  | YogaAlign
  | 'auto'
  | 'baseline'
  | 'center'
  | 'flex-end'
  | 'flex-start'
  | 'space-around'
  | 'space-between'
  | 'stretch'

export type FlexWrap = YogaFlexWrap | 'no-wrap' | 'wrap' | 'wrap-reverse'

export type R3FlexProps = Partial<{
  // Align
  alignContent: Align
  alignItems: Align
  alignSelf: Align
  // Shorthand for alignItems
  align: Align

  // Justify
  justifyContent: JustifyContent
  // Shorthand for justifyContent
  justify: JustifyContent

  // Direction
  flexDirection: FlexDirection
  // Shorthand for flexDirection
  flexDir: FlexDirection
  // Shorthand for flexDirection
  dir: FlexDirection

  // Wrap
  flexWrap: FlexWrap
  // Shorthand for flexWrap
  wrap: FlexWrap

  // Flex basis
  flexBasis: number
  // Shorthand for flexBasis
  basis: number

  // Grow & shrink
  flexGrow: number
  // Shorthand for flexBasis
  grow: number

  flexShrink: number
  // Shorthand for flexBasis
  shrink: number

  // Height & width
  height: Value
  width: Value
  maxHeight: Value
  maxWidth: Value
  minHeight: Value
  minWidth: Value

  // Padding
  padding: Value
  // Shorthand for padding
  p: Value

  paddingTop: Value
  // Shorthand for paddingTop
  pt: Value

  paddingBottom: Value
  // Shorthand for paddingBottom
  pb: Value

  paddingLeft: Value
  // Shorthand for paddingLeft
  pl: Value

  paddingRight: Value
  // Shorthand for paddingRight
  pr: Value

  // Margin
  margin: Value
  // Shorthand for margin
  m: Value

  marginTop: Value
  // Shorthand for marginTop
  mt: Value

  marginLeft: Value
  // Shorthand for marginLeft
  ml: Value

  marginRight: Value
  // Shorthand for marginRight
  mr: Value

  marginBottom: Value
  // Shorthand for marginBottom
  mb: Value
}>
