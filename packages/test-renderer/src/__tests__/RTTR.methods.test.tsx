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
  it('searches via .find() / .findAll()', async () => {})

  it('searches via .findByType() / findAllByType()', async () => {})

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
