import * as React from 'react'
import { render, events } from 'react-three-fiber'
import './styles.css'
import App from './App'

window.addEventListener('resize', () => {
  render(<App />, document.querySelector('canvas') as HTMLCanvasElement, {
    events,
    gl: { alpha: false },
    dpr: [1, 2],
    frameloop: 'always',
    performance: { min: 0.5 },
    camera: { position: [0, 0, 5] },
    size: { width: window.innerWidth, height: window.innerHeight },
  })
})

window.dispatchEvent(new Event('resize'))
