import React, { Suspense } from 'react'

import { Setup } from '../Setup'
import { withKnobs, number } from '@storybook/addon-knobs'
import { useGLTFLoader } from '../../src/loaders/useGLTFLoader'
import { useNormalTexture } from '../../src/prototyping/useNormalTexture'

export default {
  title: 'Prototyping/useNormalTexture',
  component: useNormalTexture,
  decorators: [withKnobs, (storyFn) => <Setup cameraPosition={[0, 0, 3]}>{storyFn()}</Setup>],
}

function Suzanne() {
  const { nodes } = useGLTFLoader('suzanne.glb', true)
  const repeat = number('texture repeat', 8)
  const scale = number('texture scale', 4)
  const [normalTexture] = useNormalTexture(number('texture index', 3), {
    repeat: [repeat, repeat],
    anisotropy: 8,
  });

  return (
    <mesh geometry={nodes.Suzanne.geometry} >
        <meshStandardMaterial
            attach="material"
            color="darkmagenta"
            roughness={0.9}
            metalness={0.1} 
            normalScale={[scale, scale]}
            normalMap={normalTexture}
        />
    </mesh>
  )
}

function UseNormalTexture() {
  return (
    <Suspense fallback={null}>
      <Suzanne />
    </Suspense>
  )
}

export const UseNormalTextureSt = () => <UseNormalTexture />
UseNormalTextureSt.story = {
  name: 'Default',
}
