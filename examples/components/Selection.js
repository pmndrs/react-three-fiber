import * as THREE from 'three'
import React, { useMemo, useCallback } from 'react'
import { Canvas, useThree, useRender } from 'react-three-fiber'
import { animated as anim } from 'react-spring/three'
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

  const hover = useCallback(e => console.log('hover', e.object.uuid))
  const unhover = useCallback(e => console.log('unhover'))

  return (
    <mesh {...props} onHover={hover} onUnhover={unhover}>
      <planeBufferGeometry name="geometry" args={[4, 4]} />
      <anim.meshBasicMaterial name="material">
        <primitive name="map" object={texture} />
      </anim.meshBasicMaterial>
    </mesh>
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
