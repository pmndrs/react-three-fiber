import * as THREE from 'three'
import * as WEBVR from '!exports-loader?WEBVR!three/examples/js/vr/WebVR'
import * as React from 'react'
import { Canvas, useFrame } from 'react-three-fiber'

function Stars() {
  let group = React.useRef()
  let theta = 0
  useFrame(() => {
    // Some things maybe shouldn't be declarative, we're in the render-loop here with full access to the instance
    const r = 5 * Math.sin(THREE.Math.degToRad((theta += 0.01)))
    const s = Math.cos(THREE.Math.degToRad(theta * 2))
    group.current.rotation.set(r, r, r)
    group.current.scale.set(s, s, s)
  })

  const [geo, mat, coords] = React.useMemo(() => {
    const geo = new THREE.SphereBufferGeometry(1, 10, 10)
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('lightpink') })
    const coords = new Array(1000)
      .fill()
      .map((i) => [Math.random() * 800 - 400, Math.random() * 800 - 400, Math.random() * 800 - 400])
    return [geo, mat, coords]
  }, [])

  return (
    <group ref={group}>
      {coords.map((position, i) => (
        <mesh key={i} geometry={geo} material={mat} position={position} />
      ))}
    </group>
  )
}

const camera = { position: [0, 0, 15] }

const spotLightPosition = [30, 30, 50]

function VR() {
  const onCreated = React.useCallback(function callback({ gl }) {
    document.body.appendChild(WEBVR.createButton(gl))
  }, [])

  return (
    <div className="main">
      <Canvas vr camera={camera} onCreated={onCreated}>
        <ambientLight intensity={0.5} />
        <spotLight intensity={0.6} position={spotLightPosition} angle={0.2} penumbra={1} castShadow />
        <Stars />
      </Canvas>
    </div>
  )
}

export default React.memo(VR)
