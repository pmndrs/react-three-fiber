import React, { useEffect, useState } from 'react'
import { useThree, Canvas } from '@react-three/fiber'

function Observer({ setFrameloop }: any) {
  const frameloop = useThree((state) => state.frameloop)

  useEffect(() => void setFrameloop(frameloop), [setFrameloop, frameloop])

  return null
}

export default function Demo() {
  const [frameloop, setFrameloop] = useState('never')

  return (
    <div
      style={{
        background: frameloop === 'never' ? 'white' : 'rgba(0, 0, 255, 0.08)',
        height: '100vh',
        overflowY: 'scroll',
      }}>
      <p
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '48px',
          color: 'black',
          textAlign: 'center',
        }}>
        Scroll ↓
        <br />
        <span style={{ fontSize: '24px', color: 'black', opacity: 0.7 }}>Frameloop: {frameloop}</span>
      </p>
      <div
        style={{
          height: '220vh',
          paddingBottom: '120vh',
        }}>
        <Canvas intersect camera={{ position: [0, 1.3, 3] }}>
          <Observer setFrameloop={setFrameloop} />
          <gridHelper args={[2, 2]} />
        </Canvas>
      </div>
    </div>
  )
}
