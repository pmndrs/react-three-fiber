import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'

import { createRoot, useThree, useGraph, ObjectMap, useInstanceHandle, Instance, extend } from '../src'

extend(THREE as any)

describe('hooks', () => {
  let root: ReturnType<typeof createRoot> = null!

  beforeEach(() => {
    root = createRoot(document.createElement('canvas'))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
  })

  it('can handle useThree hook', async () => {
    let result = {} as {
      camera: THREE.Camera
      scene: THREE.Scene
      raycaster: THREE.Raycaster
      size: { width: number; height: number }
    }

    const Component = () => {
      /**
       * this causes an act problem, it'd be
       * good to figure out the best way to
       * resolve this at some point
       */
      const res = useThree((state) => ({
        camera: state.camera,
        scene: state.scene,
        size: state.size,
        raycaster: state.raycaster,
      }))

      result = res

      return <group />
    }

    await act(async () => root.render(<Component />))

    // Use duck-typing instead of instanceof (fails with multiple THREE instances)
    expect((result.camera as THREE.Camera).isCamera).toBe(true)
    expect((result.scene as THREE.Scene).isScene).toBe(true)
    expect((result.raycaster as THREE.Raycaster).ray).toBeDefined()
    expect(result.size).toEqual({ height: 0, width: 0, top: 0, left: 0 })
  })

  // Note: useFrame has its own dedicated test file (useFrame.test.tsx)

  it('can handle useGraph hook', async () => {
    const group = new THREE.Group()
    const mat1 = new THREE.MeshBasicMaterial()
    mat1.name = 'Mat 1'
    const mesh1 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat1)
    mesh1.name = 'Mesh 1'
    const mat2 = new THREE.MeshBasicMaterial()
    mat2.name = 'Mat 2'
    const mesh2 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat2)
    mesh2.name = 'Mesh 2'
    const subGroup = new THREE.Group()
    const mat3 = new THREE.MeshBasicMaterial()
    mat3.name = 'Mat 3'
    const mesh3 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat3)
    mesh3.name = 'Mesh 3'
    const mat4 = new THREE.MeshBasicMaterial()
    mat4.name = 'Mat 4'
    const mesh4 = new THREE.Mesh(new THREE.BoxGeometry(2, 2), mat4)
    mesh4.name = 'Mesh 4'

    subGroup.add(mesh3, mesh4)
    group.add(mesh1, mesh2, subGroup)

    let result = {} as ObjectMap

    const Component = () => {
      const data = useGraph(group)
      result = data
      return <mesh />
    }

    await act(async () => root.render(<Component />))

    expect(result).toEqual({
      nodes: {
        [mesh1.name]: mesh1,
        [mesh2.name]: mesh2,
        [mesh3.name]: mesh3,
        [mesh4.name]: mesh4,
      },
      materials: {
        [mat1.name]: mat1,
        [mat2.name]: mat2,
        [mat3.name]: mat3,
        [mat4.name]: mat4,
      },
      meshes: {
        [mesh1.name]: mesh1,
        [mesh2.name]: mesh2,
        [mesh3.name]: mesh3,
        [mesh4.name]: mesh4,
      },
    })
  })

  it('can handle future (19.x) hooks without crashing', async () => {
    function Component() {
      // @ts-ignore
      React.useEffectEvent?.(() => {})
      return null
    }
    expect(async () => await act(async () => root.render(<Component />))).not.toThrow()
  })

  it('can handle useInstanceHandle hook', async () => {
    const ref = React.createRef<THREE.Group>()
    let instance!: React.RefObject<Instance>

    const Component = () => {
      instance = useInstanceHandle(ref)
      return <group ref={ref} />
    }
    await act(async () => root.render(<Component />))

    expect(instance.current).toBe((ref.current as unknown as Instance<THREE.Group>['object']).__r3f)
  })
})
