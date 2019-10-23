// WebGL code from https://tympanus.net/Development/DistortionHoverEffect/

import React, { useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../resources/shaders/XFadeShader'
import { Canvas, useThree } from 'react-three-fiber'
import { useSpring, a } from 'react-spring/three'
import styled from 'styled-components'

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
  const { gl, invalidate, viewport } = useThree()

  const args = useMemo(() => {
    const loader = new THREE.TextureLoader()
    const texture1 = loader.load(url1, invalidate)
    const texture2 = loader.load(url2, invalidate)
    const dispTexture = loader.load(disp, invalidate)

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
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeBufferGeometry attach="geometry" args={[1, 1]} />
      <a.shaderMaterial attach="material" args={[args]} uniforms-dispFactor-value={progress} />
    </mesh>
  )
}

function Image(props) {
  const [hovered, setHover] = useState(false)
  const hover = useCallback(() => setHover(true), [])
  const unhover = useCallback(() => setHover(false), [])
  return (
    <Item onPointerOver={hover} onPointerOut={unhover}>
      <Canvas invalidateFrameloop>
        <ImageWebgl {...props} hovered={hovered} />
      </Canvas>
    </Item>
  )
}

export default function App() {
  return (
    <Container>
      <Grid>
        {data.map(([url1, url2, disp, intensity], index) => (
          <Image key={index} url1={url1} url2={url2} disp={disp} intensity={intensity} />
        ))}
      </Grid>
    </Container>
  )
}

const Container = styled.div`
  position: absolute;
  overflow: auto;
  top: 0px;
  width: 100%;
  height: 100vh;
  font-size: 20em;
  font-weight: 800;
  line-height: 0.9em;
  background: #eee;
`

const Grid = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
`

const Item = styled.div`
  position: relative;
  width: 33%;
  height: 33%;

  & canvas {
    position: relative;
    width: 100%;
    height: 100%;
  }
`
