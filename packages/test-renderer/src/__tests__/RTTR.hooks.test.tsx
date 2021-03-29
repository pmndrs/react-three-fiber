jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'
// @ts-ignore
import * as Stdlib from 'three-stdlib'
import { Mesh, Camera, Scene, Raycaster } from 'three'

import { useFrame, useLoader, useThree } from '@react-three/fiber'

import { asyncUtils } from '../../../shared/asyncUtils'

import ReactThreeTestRenderer from '../index'

const resolvers = []

const { waitFor } = asyncUtils(ReactThreeTestRenderer.act, (resolver: () => void) => {
  resolvers.push(resolver)
})

describe('ReactThreeTestRenderer Hooks', () => {
  it('can handle useThree hook', async () => {
    let result = {} as {
      camera: Camera
      scene: Scene
      raycaster: Raycaster
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

    await ReactThreeTestRenderer.create(<Component />)

    expect(result.camera instanceof Camera).toBeTruthy()
    expect(result.scene instanceof Scene).toBeTruthy()
    expect(result.raycaster instanceof Raycaster).toBeTruthy()
    expect(result.size).toEqual({ height: 0, width: 0 })
  })

  it('can handle useLoader hook', async () => {
    const MockMesh = new Mesh()
    // @ts-ignore
    jest.spyOn(Stdlib, 'GLTFLoader').mockImplementation(() => ({
      load: jest.fn().mockImplementation((url, onLoad) => {
        onLoad(MockMesh)
      }),
    }))

    const Component = () => {
      // @ts-ignore i only need to provide an onLoad function
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
      const meshRef = React.useRef<Mesh>(null!)
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
