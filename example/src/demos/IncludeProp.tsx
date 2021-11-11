import React, { useEffect, useState } from 'react'
import { useThree, Canvas } from '@react-three/fiber'
import styled from 'styled-components'

function Observer({ setFrameloop }: any) {
  const frameloop = useThree((state) => state.frameloop)

  useEffect(() => void setFrameloop(frameloop), [setFrameloop, frameloop])

  return null
}

export default function Demo() {
  const [frameloop, setFrameloop] = useState('never')

  return (
    <DemoContainer frameloop={frameloop}>
      <DemoText>
        Scroll ↓
        <br />
        <DemoDetails>Frameloop: {frameloop}</DemoDetails>
      </DemoText>
      <div style={{ height: '220vh', paddingBottom: '120vh' }}>
        <Canvas intersect camera={{ position: [0, 1.3, 3] }}>
          <Observer setFrameloop={setFrameloop} />
          <gridHelper args={[2, 2]} />
        </Canvas>
      </div>
    </DemoContainer>
  )
}

interface DemoContainerProps {
  frameloop: string
}

const DemoContainer = styled.main<DemoContainerProps>`
  background: ${(props) => (props.frameloop === 'never' ? 'white' : 'rgba(0, 0, 255, 0.08)')};
  height: 100vh;
  overflow-y: scroll;
`

const DemoText = styled.p`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 48px;
  color: black;
  text-align: center;
`

const DemoDetails = styled.span`
  font-size: 24px;
  color: rgba(0, 0, 0, 0.7);
`
