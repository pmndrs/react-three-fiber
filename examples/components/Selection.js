import * as THREE from 'three'
import React, { useMemo, useCallback, useState } from 'react'
import { Canvas, useThree } from 'react-three-fiber'
import { useSpring, animated as a } from 'react-spring/three'
import img1 from '../resources/images/crop-1.jpg'
import img2 from '../resources/images/crop-2.jpg'
import disp1 from '../resources/images/crop-13.jpg'

const loader = new THREE.TextureLoader()
function Image({ url1, ...props }) {
  const { invalidate } = useThree()
  const texture = useMemo(() => {
    const texture = loader.load(url1, invalidate)
    texture.minFilter = THREE.LinearFilter
    return texture
  }, [url1])

  const [active, set] = useState(false)
  const animatedProps = useSpring({ rotation: [0, 0, active ? Math.PI / 2 : 0] })
  const hover = useCallback(e => {
    e.stopPropagation()
    console.log('hover', e.object.uuid)
  })
  const unhover = useCallback(e => console.log('unhover'))
  const click = useCallback(e => {
    e.stopPropagation()
    console.log('click', e)
    set(active => !active)
  }, [])

  return (
    <a.mesh {...props} onHover={hover} onUnhover={unhover} onClick={click} {...animatedProps}>
      <planeBufferGeometry name="geometry" args={[4, 4]} />
      <meshBasicMaterial name="material">
        <primitive name="map" object={texture} />
      </meshBasicMaterial>
    </a.mesh>
  )
}

export default function App() {
  return (
    <Canvas className="canvas" invalidateFrameloop>
      <Image url1={img1} url2={img2} disp={disp1} />
      <Image url1={img2} url2={img1} disp={disp1} position={[2, 2, 0]} />
    </Canvas>
  )
}
