import * as THREE from 'three'
import React, { useState, useCallback, useMemo } from 'react'
import { Canvas } from 'react-three-fiber'
import { useSpring, animated as anim } from 'react-spring/three'
import { XFadeShader } from '../resources/shaders/XFadeShader'
import img1 from '../resources/images/crop-1.jpg'
import img2 from '../resources/images/crop-2.jpg'
import disp from '../resources/images/displacement/disp1.jpg'

function Image({ url1, url2, disp, ...props }) {
  const [hovered, setHover] = useState(false)
  const hover = useCallback(() => setHover(true), [])
  const unhover = useCallback(() => setHover(false), [])
  const { progress } = useSpring({ progress: hovered ? 1 : 0 })
  const [texture1, texture2, dispTexture] = useMemo(() => {
    const loader = new THREE.TextureLoader()
    return [loader.load(url1), loader.load(url2), loader.load(disp)]
  }, [url1, url2, disp])
  return (
    <mesh {...props} onHover={hover} onUnhover={unhover}>
      <planeBufferGeometry name="geometry" args={[3.8, 3.8]} />
      <anim.shaderMaterial
        name="material"
        args={[XFadeShader]}
        uniforms-texture-value={texture1}
        uniforms-texture2-value={texture2}
        uniforms-disp-value={dispTexture}
        uniforms-dispFactor-value={progress}
      />
    </mesh>
  )
}

export default function App() {
  return (
    <Canvas className="canvas">
      <Image url1={img1} url2={img2} disp={disp} />
    </Canvas>
  )
}
