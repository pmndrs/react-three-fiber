import { Canvas, flushSync, useThree } from '@react-three/fiber'
import { useCallback, useRef, useState } from 'react'

const colors = ['orange', 'hotpink', 'cyan', 'lime', 'yellow', 'red', 'blue', 'purple', 'green', 'coral']

function Capture() {
  const [color, setColor] = useState(colors[0])
  const { gl } = useThree()
  const wantToCapture = useRef(false)

  const handleClick = useCallback(() => {
    // Use flushSync to ensure the color is updated immediately
    flushSync(() => setColor(colors[Math.floor(Math.random() * colors.length)]))
    wantToCapture.current = true
  }, [])

  const captureScreenshot = useCallback(() => {
    if (wantToCapture.current) {
      wantToCapture.current = false

      // Takes a screenshot of the canvas and downloads it
      const link = document.createElement('a')
      link.href = gl.domElement.toDataURL()
      link.download = 'screenshot.png'
      link.click()
    }
  }, [gl])

  return (
    <mesh onClick={handleClick} onAfterRender={captureScreenshot}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas>
      <ambientLight intensity={Math.PI * 0.5} />
      <spotLight decay={0} position={[10, 10, 10]} angle={0.15} penumbra={1} />
      <Capture />
    </Canvas>
  )
}
