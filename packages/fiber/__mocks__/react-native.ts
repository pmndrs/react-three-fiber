import * as React from 'react'
import { ViewProps, LayoutChangeEvent, View as RNView } from 'react-native'

// Mocks a View or container as React sees it
const Container = React.memo(({ onLayout, ...props }: ViewProps) => {
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
  }, [onLayout])

  // React.useImperativeHandle(ref, () => props)

  return null
})

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

export const PanResponder = {
  create: () => ({ panHandlers: {} }),
}

export const Image = {
  getSize(_uri: string, res: Function, rej?: Function) {
    res(1, 1)
  },
}

export const Platform = {
  OS: 'web',
}

export const NativeModules = {}
