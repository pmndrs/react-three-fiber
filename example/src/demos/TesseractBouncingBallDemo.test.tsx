import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/extend-expect'
import { Canvas } from '@react-three/fiber'
import TesseractBouncingBallDemo, { Tesseract, BouncingBall, NarrativeOverlay } from './TesseractBouncingBallDemo'

describe('TesseractBouncingBallDemo', () => {
  it('renders the Tesseract component', () => {
    render(
      <Canvas>
        <Tesseract />
      </Canvas>
    )
    const lines = screen.getAllByRole('line')
    expect(lines.length).toBeGreaterThan(0)
  })

  it('renders the BouncingBall component', () => {
    render(
      <Canvas>
        <BouncingBall />
      </Canvas>
    )
    const ball = screen.getByRole('mesh')
    expect(ball).toBeInTheDocument()
  })

  it('renders the NarrativeOverlay component', () => {
    render(<NarrativeOverlay />)
    const text = screen.getByText('The ball whispers secrets of higher dimensions...')
    expect(text).toBeInTheDocument()
  })
})
