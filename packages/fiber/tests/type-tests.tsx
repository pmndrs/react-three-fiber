import type * as React from 'react'
import { Canvas } from '@react-three/fiber'

type IconProps = {
  icon: React.ElementType
  size?: number
}

const Icon = ({ icon: IconComponent, size = 24 }: IconProps) => {
  return <IconComponent size={size} />
}

const Test = () => {
  return (
    <>
      <Icon icon="svg" size={32} />
      <Canvas>
        <group />
      </Canvas>
    </>
  )
}

void Test
void Icon
