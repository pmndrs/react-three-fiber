import { Canvas, useFrame, useThree } from '@react-three/fiber/webgpu'
import { useEffect, useRef } from 'react'
import { Mesh } from 'three'
import Stats from 'stats-gl'

let position = { x: 0, y: 0 }

const Box = () => {
  const ref = useRef<Mesh>(null)

  useFrame(() => {
    if (ref.current) {
      ref.current.position.x = position.x
      ref.current.position.y = position.y
    }
  })

  return (
    <mesh ref={ref}>
      <boxGeometry />
      <meshBasicMaterial color="red" />
    </mesh>
  )
}

const MovementSystem = () => {
  useFrame(({ elapsed }) => {
    position.x = Math.sin(elapsed)
    position.y = Math.cos(elapsed)
  })

  return null
}

const RenderLoop = () => {
  // attach stats to the renderer
  const { renderer } = useThree()
  const stats = useRef<Stats | null>(null)

  useEffect(() => {
    stats.current = new Stats({ trackGPU: true })
    document.body.appendChild(stats.current.dom)
    stats.current.init(renderer)
    return () => {
      stats.current?.dispose()
      if (stats.current) document.body.removeChild(stats.current.dom)
    }
  }, [renderer])
  useFrame(
    ({ renderer, camera, scene }) => {
      renderer.render(scene, camera)
      stats.current?.update()
    },
    { fps: 60, phase: 'render' },
  )

  return null
}

export default function VerekiaFpsDrop() {
  return (
    <>
      <Canvas>
        <Box />
        <RenderLoop />
      </Canvas>
      <MovementSystem />
    </>
  )
}
