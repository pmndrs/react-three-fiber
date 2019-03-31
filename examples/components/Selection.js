import * as THREE from 'three'
import React, { useMemo, useCallback, useState } from 'react'
import { Canvas, useThree } from 'react-three-fiber'
import { useSpring, animated as a } from 'react-spring/three'
import img1 from '../resources/images/crop-1.jpg'
import img2 from '../resources/images/crop-2.jpg'
import disp1 from '../resources/images/crop-13.jpg'
import useGesture from 'react-use-gesture'
import { add, scale } from 'vec-la'
import 'pepjs'

const loader = new THREE.TextureLoader()
function Image({ url1, position = [0, 0, 0], ...props }) {
  const { invalidate, size, viewport } = useThree()
  const texture = useMemo(() => {
    const texture = loader.load(url1, invalidate)
    texture.minFilter = THREE.LinearFilter
    return texture
  }, [url1])

  const [{ xy }, setXY] = useSpring(() => ({ xy: [0, 0] }))
  const [active, set] = useState(false)
  const animatedProps = useSpring({ rotation: [0, 0, active ? Math.PI / 4 : 0] })
  const hover = useCallback(e => {
    e.stopPropagation()
    console.log('hover', e.object.uuid)
  }, [])
  const unhover = useCallback(e => console.log('unhover', e.object.uuid), [])
  const move = useCallback(e => {
    event.stopPropagation()
    if (e.buttons > 0) setXY({ xy: [e.ray.direction.x, e.ray.direction.y] })
    //console.log('move', e.ray.direction)
  }, [])
  const click = useCallback(e => {
    e.stopPropagation()
    console.log('click', e)
    set(active => !active)
  }, [])

  /*const [{ xy }, setXY] = useSpring(() => ({ xy: [0, 0] }))
  const bind = useGesture({
    onDrag: ({ event, down, delta, velocity, direction, temp = xy.getValue() }) => {
      event.stopPropagation()
      setXY({ xy: add(delta, temp) })
      return temp
    },
  })*/

  return (
    <a.mesh
      {...props}
      position={xy.interpolate((x, y) => [x + position[0], y + position[1], position[2]])}
      onClick={click}
      onPointerDown={e => {
        e.stopPropagation()
        e.target.setPointerCapture(e.pointerId)
      }}
      onPointerUp={e => {
        e.stopPropagation()
        //e.target.releasePointerCapture(e.pointerId)
      }}
      onPointerMove={move}
      onPointerOver={hover}
      onPointerOut={unhover}
      //{...bind()}
      {...animatedProps}>
      <planeBufferGeometry attach="geometry" args={[4, 4]} />
      <meshBasicMaterial attach="material">
        <primitive attach="map" object={texture} />
      </meshBasicMaterial>
    </a.mesh>
  )
}

export default function App() {
  return (
    <Canvas className="canvas" invalidateFrameloop>
      <Image url1={img1} url2={img2} disp={disp1} />
      <Image url1={img2} url2={img1} disp={disp1} position={[2, 2, 0.000000001]} />
    </Canvas>
  )
}
