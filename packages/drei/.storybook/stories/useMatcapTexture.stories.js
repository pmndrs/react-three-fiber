import React, { Suspense } from 'react'

import { Setup } from '../Setup'
import { withKnobs, number } from '@storybook/addon-knobs'
import { useGLTFLoader } from '../../src/loaders/useGLTFLoader'
import { useMatcapTexture } from '../../src/prototyping/useMatcapTexture'

export default {
  title: 'Prototyping/useMatcapTexture',
  component: useMatcapTexture,
  decorators: [withKnobs, (storyFn) => <Setup cameraPosition={[0, 0, 3]}>{storyFn()}</Setup>],
}

function Suzanne() {
  const { nodes } = useGLTFLoader('suzanne.glb', true)
  const [matcapTexture] = useMatcapTexture(
    number('texture index', 111),
    1024
  );

  return (
    <mesh geometry={nodes.Suzanne.geometry} >
        <meshMatcapMaterial
            attach="material"
            matcap={matcapTexture}
        />
    </mesh>
  )
}

function UseMatcapTexture() {
  return (
    <Suspense fallback={null}>
      <Suzanne />
    </Suspense>
  )
}

export const UseMatcapTextureSt = () => <UseMatcapTexture />
UseMatcapTextureSt.story = {
  name: 'Default',
}
