jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'

import ReactThreeTestRenderer from '../index'

describe('ReactThreeTestRenderer instance methods', () => {
  const ExampleComponent = () => {
    return (
      <group>
        <mesh name="mesh_01">
          <boxBufferGeometry args={[2, 2]} />
          <meshStandardMaterial color={0x0000ff} />
        </mesh>
        <mesh name="mesh_02">
          <boxBufferGeometry args={[2, 2]} />
          <meshBasicMaterial color={0x0000ff} />
        </mesh>
      </group>
    )
  }

  it('should pass the parent', async () => {
    const { scene } = await ReactThreeTestRenderer.create(<ExampleComponent />)

    expect(scene.parent).toBeNull()

    expect(scene.children[0].parent).toBeDefined()
    expect(scene.children[0].parent!.type).toEqual('Scene')
  })

  it('searches via .find() / .findAll()', async () => {
    const { scene } = await ReactThreeTestRenderer.create(<ExampleComponent />)

    const foundByName = scene.find((node) => node.instance.name === 'mesh_01')

    expect(foundByName.type).toEqual('Mesh')

    const foundAllByColor = scene.findAll((node) => node.props.color === 0x0000ff)

    expect(foundAllByColor).toHaveLength(2)
    expect(foundAllByColor[0].type).toEqual('MeshStandardMaterial')
    expect(foundAllByColor[1].type).toEqual('MeshBasicMaterial')

    const foundAllByType = scene.findAll((node) => node.type === 'InstancedMesh')

    expect(foundAllByType).toHaveLength(0)
    expect(foundAllByType).toEqual([])

    expect(() => scene.find((node) => node.props.color === 0x0000ff)).toThrow()
  })

  it('searches via .findByType() / findAllByType()', async () => {
    const { scene } = await ReactThreeTestRenderer.create(<ExampleComponent />)

    const foundByStandardMaterial = scene.findByType('MeshStandardMaterial')

    expect(foundByStandardMaterial).toBeDefined()

    const foundAllByMesh = scene.findAllByType('Mesh')

    expect(foundAllByMesh).toHaveLength(2)
    expect(foundAllByMesh[0].instance.name).toEqual('mesh_01')
    expect(foundAllByMesh[1].instance.name).toEqual('mesh_02')

    const foundAllByBoxBufferGeometry = scene.findAllByType('BoxBufferGeometry')

    expect(foundAllByBoxBufferGeometry).toHaveLength(0)
    expect(foundAllByBoxBufferGeometry).toEqual([])

    expect(() => scene.findByType('BufferGeometry')).toThrow()
  })

  it('searches via .findByProps() / .findAllByProps()', async () => {
    const { scene } = await ReactThreeTestRenderer.create(<ExampleComponent />)

    const foundByName = scene.findByProps({
      name: 'mesh_01',
    })

    expect(foundByName.type).toEqual('Mesh')

    const foundAllByColor = scene.findAllByProps({
      color: 0x0000ff,
    })

    expect(foundAllByColor).toHaveLength(2)
    expect(foundAllByColor[0].type).toEqual('MeshStandardMaterial')
    expect(foundAllByColor[1].type).toEqual('MeshBasicMaterial')

    const foundAllByColorAndName = scene.findAllByProps({
      color: 0x0000ff,
      name: 'mesh_01',
    })

    expect(foundAllByColorAndName).toHaveLength(0)
    expect(foundAllByColorAndName).toEqual([])

    expect(() => scene.findByProps({ color: 0x0000ff })).toThrow()
  })
})
