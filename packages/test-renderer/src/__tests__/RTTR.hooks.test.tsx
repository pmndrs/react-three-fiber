import * as React from 'react'
import * as Stdlib from 'three-stdlib'
import * as THREE from 'three'

import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { waitFor } from '@react-three/test-renderer'

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
    expect(result.size).toEqual({ height: 800, width: 1280, top: 0, left: 0, updateStyle: true })
  })

  it('can handle useLoader hook', async () => {
    const MockMesh = new THREE.Mesh()
    jest.spyOn(Stdlib, 'GLTFLoader').mockImplementation(
      () =>
        ({
          load: jest.fn().mockImplementation((_url, onLoad) => {
            onLoad(MockMesh)
          }),
        } as unknown as Stdlib.GLTFLoader),
    )

    const Component = () => {
      const model = useLoader(Stdlib.GLTFLoader, '/suzanne.glb')

      return <primitive object={model} />
    }

    const renderer = await ReactThreeTestRenderer.create(
      <React.Suspense fallback={null}>
        <Component />
      </React.Suspense>,
    )

    await waitFor(() => expect(renderer.scene.children[0]).toBeDefined())

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
})
