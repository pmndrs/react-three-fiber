import * as React from 'react'

export default function useMeasure() {
  const element = React.useRef<HTMLElement | null>(null)
  const [bounds] = React.useState({
    left: 0,
    top: 0,
    width: 1280,
    height: 800,
    bottom: 0,
    right: 0,
    x: 0,
    y: 0,
  })
  const ref = (node: HTMLElement) => {
    if (!node || element.current) {
      return
    }
    element.current = node
  }
  return [ref, bounds]
}
