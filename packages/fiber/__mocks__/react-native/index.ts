import * as React from 'react'
import { ViewProps, LayoutChangeEvent } from 'react-native'

// Mocks a View or container as React sees it
const Container = React.memo(
  React.forwardRef(({ onLayout, ...props }: ViewProps, ref) => {
    React.useLayoutEffect(() => {
      onLayout?.({
        nativeEvent: {
          layout: {
            x: 0,
            y: 0,
            width: 1280,
            height: 800,
          },
        },
      } as LayoutChangeEvent)

      ref = { current: { props } }
    }, [])

    return null
  }),
)

export const View = Container
export const Pressable = Container

export const StyleSheet = {
  absoluteFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
}
