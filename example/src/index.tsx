import React from 'react'
import { render, Canvas } from 'react-three-fiber'
import './styles.css'
import App from './App'

const root = document.getElementById('root') as HTMLDivElement
const canvas = document.querySelector('canvas') as HTMLCanvasElement

window.addEventListener('resize', () =>
  render(<App />, canvas, {    
    gl: { alpha: false },
    dpr: [1, 2],
    frameloop: true,
    performance: { min: 0.5 },
    camera: { position: [0, 0, 5] },
    size: { width: root.clientWidth, height: root.clientHeight },
  }),
)

window.dispatchEvent(new Event('resize'))
