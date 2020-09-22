import React, { useRef } from 'react'
import { useControl } from 'react-three-gui'

function Lights() {
  const $dirLight = useRef()
  const $backLight = useRef()

  const color = useControl('lights color', {
    group: 'Scene',
    type: 'color',
    value: '#ff0000',
  })

  return (
    <>
      <spotLight
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        distance={9}
        angle={0.4}
        penumbra={0.3}
        castShadow
        ref={$dirLight}
        color={color}
        position={[0, 0, -10]}
      />

      <pointLight color={color} position={[0, 1, -10]} intensity={0.3} />

      <spotLight ref={$backLight} position={[0, 1, 3]} intensity={0.4} distance={4} color="blue" />

      <directionalLight position={[0, 0, 0]} intensity={0.1} />
    </>
  )
}

export default Lights
