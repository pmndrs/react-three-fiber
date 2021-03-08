import React from 'react'
import { render } from 'react-three-fiber'
import './styles.css'
import App from './App'

window.addEventListener('resize', () =>
  render(<App />, document.getElementById('canvas') as HTMLCanvasElement, {
    gl: { alpha: false },
    pixelRatio: [1, 2],
    camera: { position: [0, 0, 5] },
    size: { width: window.innerWidth, height: window.innerHeight },
  }),
)

window.dispatchEvent(new Event('resize'))
