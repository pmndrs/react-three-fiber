import React from 'react'
import { Canvas /*, useThree, useFrame*/ } from 'react-three-fiber'
// import { render } from '../../../../src/targets/css2d'

// function Labels() {
//   const { camera, scene } = useThree()
//   return null
// }

const style = { background: '#272730' }

function CSS2DRenderer() {
  return (
    <Canvas style={style}>
      <mesh>
        <sphereBufferGeometry attach="geometry" />
      </mesh>
    </Canvas>
  )
}

export default React.memo(CSS2DRenderer)
