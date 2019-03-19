// WebGL code from https://tympanus.net/Development/DistortionHoverEffect/

import React, { useState, useCallback, useMemo } from 'react'
import ReactDOM from 'react-dom'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../resources/shaders/XFadeShader'
import { Canvas, useThree } from 'react-three-fiber'
import { useSpring, animated as anim } from 'react-spring/three'

import img1 from '../resources/images/crop-1.jpg'
import img2 from '../resources/images/crop-2.jpg'
import img3 from '../resources/images/crop-3.jpg'
import img4 from '../resources/images/crop-4.jpg'
import img5 from '../resources/images/crop-5.jpg'
import img6 from '../resources/images/crop-6.jpg'
import img7 from '../resources/images/crop-7.jpg'
import img8 from '../resources/images/crop-8.jpg'
import img9 from '../resources/images/crop-9.jpg'
import img10 from '../resources/images/crop-10.jpg'
import img11 from '../resources/images/crop-11.jpg'
import img12 from '../resources/images/crop-12.jpg'
import img13 from '../resources/images/crop-13.jpg'
import img14 from '../resources/images/crop-14.jpg'
import img15 from '../resources/images/crop-1.jpg'
import img16 from '../resources/images/crop-2.jpg'
import img17 from '../resources/images/crop-3.jpg'
import img18 from '../resources/images/crop-4.jpg'
import img19 from '../resources/images/crop-5.jpg'
import img20 from '../resources/images/crop-6.jpg'
import img21 from '../resources/images/crop-7.jpg'
import img22 from '../resources/images/crop-8.jpg'
import img23 from '../resources/images/crop-9.jpg'
import img24 from '../resources/images/crop-10.jpg'
import img25 from '../resources/images/crop-11.jpg'
import img26 from '../resources/images/crop-12.jpg'
import disp1 from '../resources/images/crop-13.jpg'
import disp2 from '../resources/images/crop-14.jpg'
import disp3 from '../resources/images/crop-1.jpg'
import disp4 from '../resources/images/crop-2.jpg'
import disp5 from '../resources/images/crop-3.jpg'
import disp6 from '../resources/images/crop-4.jpg'
import disp7 from '../resources/images/crop-5.jpg'
import disp8 from '../resources/images/crop-6.jpg'
import disp9 from '../resources/images/crop-7.jpg'
import disp10 from '../resources/images/crop-8.jpg'
import disp11 from '../resources/images/crop-9.jpg'
import disp13 from '../resources/images/crop-10.jpg'
import disp15 from '../resources/images/crop-11.jpg'

import '../styles.css'

// data.map(([url1, url2, disp, intensity, x, y, factor, z, scale], index) => (

const data = [
  [img22, img21, disp8, -0.65],
  [img23, img24, disp4, 0.2],
  [img1, img13, disp1, -0.4],
  [img19, img20, disp7, 0.9],
  [img2, img3, disp10, 0.6],
  [img5, img4, disp6, 0.6],
  [img10, img6, disp11, 0.4],
  [img11, img18, disp2, 0.6],
  [img7, img14, disp15, -0.1],
  [img8, img15, disp13, 0.2],
  [img26, img25, disp8, -0.8],
]

function ImageWebgl({ url1, url2, disp, intensity, hovered }) {
  const { progress } = useSpring({ progress: hovered ? 1 : 0 })

  const { gl } = useThree()

  const args = useMemo(() => {
    const loader = new THREE.TextureLoader()
    const texture1 = loader.load(url1)
    const texture2 = loader.load(url2)
    const dispTexture = loader.load(disp)

    dispTexture.wrapS = dispTexture.wrapT = THREE.RepeatWrapping
    texture1.magFilter = texture2.magFilter = THREE.LinearFilter
    texture1.minFilter = texture2.minFilter = THREE.LinearFilter

    texture1.anisotropy = gl.capabilities.getMaxAnisotropy()
    texture2.anisotropy = gl.capabilities.getMaxAnisotropy()
    return {
      uniforms: {
        effectFactor: { type: 'f', value: intensity },
        dispFactor: { type: 'f', value: 0 },
        texture: { type: 't', value: texture1 },
        texture2: { type: 't', value: texture2 },
        disp: { type: 't', value: dispTexture },
      },
      vertexShader,
      fragmentShader,
    }
  }, [url1, url2, disp])

  return (
    <mesh>
      <planeBufferGeometry name="geometry" args={[8, 8]} />
      <anim.shaderMaterial name="material" args={[args]} uniforms-dispFactor-value={progress} />
    </mesh>
  )
}

function Image(props) {
  const [hovered, setHover] = useState(false)
  const hover = useCallback(() => setHover(true), [])
  const unhover = useCallback(() => setHover(false), [])
  return (
    <div
      className="item"
      onMouseEnter={hover}
      onMouseLeave={unhover}
      onTouchStart={hover}
      onTouchEnd={unhover}
      onTouchCancel={unhover}>
      <Canvas className="canvas" invalidateFrameloop={true}>
        <ImageWebgl {...props} hovered={hovered} />
      </Canvas>
    </div>
  )
}

export default function App() {
  return (
    <div className="grid">
      {data.map(([url1, url2, disp, intensity], index) => (
        <Image key={index} url1={url1} url2={url2} disp={disp} intensity={intensity} />
      ))}
    </div>
  )
}
