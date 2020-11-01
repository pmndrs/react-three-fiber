import React from 'react'
import { render } from '../src/targets/web'
import { Group, Mesh, Vector3, BufferGeometry, MeshBasicMaterial } from 'three'

describe('renderer', () => {
  test('should produce idempotent sibling nodes movement', () => {
    const rootGroup = new Group()

    render(
      <>
        <group key="a" />
        <group key="b" />
        <group key="c" />
      </>,
      rootGroup
    )

    // Should  move 'b' node before 'a' one with insertBefore
    render(
      <>
        <group key="b" />
        <group key="a" />
        <group key="c" />
      </>,
      rootGroup
    )

    expect(rootGroup.children.length).toBe(3)
  })

  test('simple mesh test', () => {
    const rootGroup = new Group()

    const position = new Vector3(1, 1, 1)

    render(
      <mesh position={position}>
        <boxBufferGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </mesh>,
      rootGroup
    )

    expect(rootGroup.children.length).toBe(1)
    expect(rootGroup.children[0]).toBeInstanceOf(Mesh)

    const mesh = rootGroup.children[0] as Mesh
    expect(mesh.position).toStrictEqual(position)
    expect(mesh.geometry).toBeInstanceOf(BufferGeometry)
    expect(mesh.material).toBeInstanceOf(MeshBasicMaterial)
  })
})
