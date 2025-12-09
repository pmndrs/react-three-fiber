import * as React from 'react'
import { ViewProps, LayoutChangeEvent } from 'react-native'

export class View extends React.Component<Omit<ViewProps, 'children'> & { children: React.ReactNode }> {
  componentDidMount() {
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
    const { onLayout, ...props } = this.props
    return React.createElement('view', props)
  }
}

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

export const PixelRatio = {
  get() {
    return 1
  },
}
