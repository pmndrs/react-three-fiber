import * as React from 'react'
import * as THREE from 'three'
import { useFrame, useLoader, useThree } from '@react-three/fiber'

import ReactThreeTestRenderer from '../index'

describe('ReactThreeTestRenderer Hooks', () => {
  it('can handle useThree hook', async () => {
    let result = {} as {
      camera: THREE.Camera
      scene: THREE.Scene
      raycaster: THREE.Raycaster
      size: { width: number; height: number }
    }

    const Component = () => {
      const res = useThree((state) => ({
        camera: state.camera,
        scene: state.scene,
        size: state.size,
        raycaster: state.raycaster,
      }))

      result = res

      return <group />
    }

    await ReactThreeTestRenderer.create(<Component />, { width: 1280, height: 800 })

    expect(result.camera instanceof THREE.Camera).toBeTruthy()
    expect(result.scene instanceof THREE.Scene).toBeTruthy()
    expect(result.raycaster instanceof THREE.Raycaster).toBeTruthy()
    expect(result.size).toEqual({ height: 800, width: 1280, top: 0, left: 0 })
  })

  it('can handle useLoader hook', async () => {
    const MockMesh = new THREE.Mesh()
    class Loader extends THREE.Loader<THREE.Mesh, string> {
      load(url: string, onLoad: (mesh: THREE.Mesh) => void): void {
        onLoad(MockMesh)
      }
    }

    const Component = () => {
      const model = useLoader(Loader, '/suzanne.glb')

      return <primitive object={model} />
    }

    const renderer = await ReactThreeTestRenderer.create(<Component />)
    expect(renderer.scene.children[0].instance).toBe(MockMesh)
  })

  it('can handle useFrame hook using test renderers advanceFrames function', async () => {
    const Component = () => {
      const meshRef = React.useRef<THREE.Mesh>(null!)
      useFrame((_, delta) => {
        meshRef.current.rotation.x += delta
      })

      return (
        <mesh ref={meshRef}>
          <boxGeometry args={[2, 2]} />
          <meshBasicMaterial />
        </mesh>
      )
    }

    const renderer = await ReactThreeTestRenderer.create(<Component />)

    expect(renderer.scene.children[0].instance.rotation.x).toEqual(0)

    await ReactThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(2, 1)
    })

    expect(renderer.scene.children[0].instance.rotation.x).toEqual(2)
  })

  it.each([
    { delta: [0.25, 0, 0.5], frames: 3, expected: [0.25, 0, 0.5] },
    { delta: [0.25, 0], frames: 4, expected: [0.25, 0, 0, 0] },
    { delta: [0.25, 0.5], frames: 4, expected: [0.25, 0.5, 0.5, 0.5] },
    { delta: [0], frames: 3, expected: [0, 0, 0] },
    { delta: [0.25, 0.5, 1], frames: 2, expected: [0.25, 0.5] },
    { delta: 0, frames: 3, expected: [0, 0, 0] },
    { delta: 0.5, frames: 3, expected: [0.5, 0.5, 0.5] },
  ])('passes frame deltas to every subscriber: %j', async ({ delta, frames, expected }) => {
    const first: number[] = []
    const second: number[] = []
    function Component() {
      useFrame((_, delta) => first.push(delta))
      useFrame((_, delta) => second.push(delta))
      return null
    }
    const renderer = await ReactThreeTestRenderer.create(<Component />)
    await renderer.advanceFrames(frames, delta)
    expect(first).toEqual(expected)
    expect(second).toEqual(expected)
    await renderer.unmount()
  })
})
