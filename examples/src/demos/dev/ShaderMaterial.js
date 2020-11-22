// WebGL code from https://tympanus.net/Development/DistortionHoverEffect/

import * as React from 'react'
import * as THREE from 'three'
import { vertexShader, fragmentShader } from '../../resources/shaders/XFadeShader'
import { Canvas, useThree } from 'react-three-fiber'
import { useSpring, a } from 'react-spring/three'
import styled from 'styled-components'

import crop1 from '../../resources/images/crop-1.jpg'
import crop2 from '../../resources/images/crop-2.jpg'
import crop3 from '../../resources/images/crop-3.jpg'
import crop4 from '../../resources/images/crop-4.jpg'
import crop5 from '../../resources/images/crop-5.jpg'
import crop6 from '../../resources/images/crop-6.jpg'
import crop7 from '../../resources/images/crop-7.jpg'
import crop8 from '../../resources/images/crop-8.jpg'
import crop9 from '../../resources/images/crop-9.jpg'
import crop10 from '../../resources/images/crop-10.jpg'
import crop11 from '../../resources/images/crop-11.jpg'
import crop12 from '../../resources/images/crop-12.jpg'
import crop13 from '../../resources/images/crop-13.jpg'
import crop14 from '../../resources/images/crop-14.jpg'

const img1 = crop1
const img2 = crop2
const img3 = crop3
const img4 = crop4
const img5 = crop5
const img6 = crop6
const img7 = crop7
const img8 = crop8
// const img9 = crop9
const img10 = crop10
const img11 = crop11
// const img12 = crop12
const img13 = crop13
const img14 = crop14
const img15 = crop1
const img16 = crop2
const img17 = crop3
const img18 = crop4
const img19 = crop5
const img20 = crop6
const img21 = crop7
const img22 = crop8
const img23 = crop9
const img24 = crop10
const img25 = crop11
const img26 = crop12

const disp1 = crop13
const disp2 = crop14
const disp3 = crop1
const disp4 = crop2
// const disp5 = crop3
const disp6 = crop4
const disp7 = crop5
const disp8 = crop6
// const disp9 = crop7
const disp10 = crop8
const disp11 = crop9
const disp13 = crop10
const disp15 = crop11

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
  [img17, img16, disp3, -0.8],
]

const planeBufferGeometryArgs = [1, 1]

function ImageWebgl({ url1, url2, disp, intensity, hovered }) {
  const { progress } = useSpring({ progress: hovered ? 1 : 0 })
  const { gl, invalidate, viewport } = useThree()
  const { width, height } = viewport()

  const scale = React.useMemo(() => [width, height, 1], [width, height])

  const args = React.useMemo(() => {
    const loader = new THREE.TextureLoader()
    const texture1 = loader.load(url1, invalidate)
    const texture2 = loader.load(url2, invalidate)
    const dispTexture = loader.load(disp, invalidate)

    dispTexture.wrapS = dispTexture.wrapT = THREE.RepeatWrapping
    texture1.magFilter = texture2.magFilter = THREE.LinearFilter
    texture1.minFilter = texture2.minFilter = THREE.LinearFilter

    texture1.anisotropy = gl.capabilities.getMaxAnisotropy()
    texture2.anisotropy = gl.capabilities.getMaxAnisotropy()
    return [
      {
        uniforms: {
          effectFactor: { type: 'f', value: intensity },
          dispFactor: { type: 'f', value: 0 },
          tex: { type: 't', value: texture1 },
          tex2: { type: 't', value: texture2 },
          disp: { type: 't', value: dispTexture },
        },
        vertexShader,
        fragmentShader,
      },
    ]
  }, [url1, url2, disp, gl.capabilities, intensity, invalidate])

  return (
    <mesh scale={scale}>
      <planeBufferGeometry attach="geometry" args={planeBufferGeometryArgs} />
      <a.shaderMaterial attach="material" args={args} uniforms-dispFactor-value={progress} />
    </mesh>
  )
}

function Image(props) {
  const [hovered, setHover] = React.useState(false)
  const onPointerOver = React.useCallback(() => setHover(true), [])
  const onPointerOut = React.useCallback(() => setHover(false), [])
  return (
    <Item onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
      <Canvas invalidateFrameloop>
        <ImageWebgl {...props} hovered={hovered} />
      </Canvas>
    </Item>
  )
}

function ShaderMaterial() {
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

export default React.memo(ShaderMaterial)

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
