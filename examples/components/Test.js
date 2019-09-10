import * as THREE from 'three'
import React, { useMemo, useCallback, useState } from 'react'
import { Canvas, useThree } from 'react-three-fiber'
import { useSpring, animated as a } from 'react-spring/three'
import img1 from '../resources/images/crop-1.jpg'
import img2 from '../resources/images/crop-2.jpg'

function Image({ url, renderOrder, ...props }) {
  const { invalidate } = useThree()
  const texture = useMemo(() => new THREE.TextureLoader().load(url, invalidate), [url, invalidate])
  const [active, set] = useState(false)
  const animatedProps = useSpring({ rotation: [0, 0, active ? Math.PI / 2 : 0] })
  const click = useCallback(e => {
    console.log(e.distance, e.object.renderOrder)
    e.stopPropagation()
    set(active => !active)
  }, [])

  return (
    <a.mesh {...props} onClick={click} {...animatedProps} renderOrder={renderOrder}>
      <planeBufferGeometry attach="geometry" args={[4, 4]} />
      <meshBasicMaterial attach="material" map={texture} />
    </a.mesh>
  )
}

export default function App() {
  return (
    <Canvas className="canvas" invalidateFrameloop>
      <Image url={img1} renderOrder={0} />
      <Image url={img2} position={[2, 2, 0]} renderOrder={1} />
    </Canvas>
  )
}
