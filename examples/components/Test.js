import * as THREE from 'three'
import React, { useMemo } from 'react'
import { Canvas, useThree, useRender, invalidate } from 'react-three-fiber'
import { animated as anim } from 'react-spring/three'
import img1 from '../resources/images/crop-1.jpg'
import img2 from '../resources/images/crop-2.jpg'
import disp1 from '../resources/images/crop-13.jpg'

const loader = new THREE.TextureLoader()
function Image({ url1 }) {
  const texture = useMemo(() => {
    const texture = loader.load(url1)
    texture.minFilter = THREE.LinearFilter
    return texture
  }, [url1])

  return (
    <mesh>
      <planeBufferGeometry name="geometry" args={[5, 5]} />
      <anim.meshBasicMaterial name="material">
        <primitive name="map" object={texture} />
      </anim.meshBasicMaterial>
    </mesh>
  )
}

export default function App() {
  return (
    <>
      <button onClick={() => invalidate(true)}>Invalidate</button>
      <Canvas className="canvas" invalidateFrameloop={true}>
        <Image url1={img1} url2={img2} disp={disp1} />
      </Canvas>
    </>
  )
}
