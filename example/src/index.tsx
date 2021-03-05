import React from 'react'
import './styles.css'
import { render } from 'react-three-fiber'
import App from './App'

window.addEventListener('resize', () =>
  render(<App />, document.getElementById('canvas') as HTMLCanvasElement, {
    gl: { alpha: false },
    pixelRatio: [1, 2],
    size: { width: window.innerWidth, height: window.innerHeight },
  })
)

window.dispatchEvent(new Event('resize'))
