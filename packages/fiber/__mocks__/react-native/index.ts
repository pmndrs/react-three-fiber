import * as React from 'react'
import { ViewProps, LayoutChangeEvent } from 'react-native'

// Mocks a View or container as React sees it
class NativeContainer extends React.Component<ViewProps> {
  componentDidMount(): void {
    this.props.onLayout?.({
      nativeEvent: {
        layout: {
          x: 0,
          y: 0,
          width: 1280,
          height: 800,
        },
      },
    } as LayoutChangeEvent)
  }

  render() {
    return this.props.children
  }
}

export const View = NativeContainer

export const StyleSheet = {
  absoluteFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
}

export const PixelRatio = {
  get() {
    return 1
  },
}
