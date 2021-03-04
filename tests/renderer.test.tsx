import React from 'react'
import TestRenderer from 'react-test-renderer'
import { render } from '../src/core'
import { Group, Mesh, Vector3, BufferGeometry, MeshBasicMaterial } from 'three'
import createContext from 'gl'

describe('renderer', () => {
  test('should produce idempotent sibling nodes movement', () => {
    const canvas = document.createElement('canvas')
    //@ts-expect-error
    canvas.getContext = () => {
      const context = createContext(1280, 800)
      return context
    }
    canvas.height = 1280
    canvas.width = 1280
    canvas.addEventListener = () => null
    canvas.removeEventListener = () => null

    const Comp = () => {
      return render(
        <>
          <group key="a" />
          <group key="b" />
          <group key="c" />
        </>,
        canvas
      ) as JSX.Element
    }

    // Should  move 'b' node before 'a' one with insertBefore
    const scene = render(
      <>
        <group key="b" />
        <group key="a" />
        <group key="c" />
      </>,
      canvas
    )

    // console.log('Test', testRen)

    expect(scene).toBe(null)
  })

  // test('simple mesh test', () => {
  //   const rootGroup = new Group()

  //   const position = new Vector3(1, 1, 1)

  //   render(
  //     <mesh position={position}>
  //       <boxBufferGeometry args={[1, 1, 1]} />
  //       <meshBasicMaterial />
  //     </mesh>,
  //     rootGroup
  //   )

  //   expect(rootGroup.children.length).toBe(1)
  //   expect(rootGroup.children[0]).toBeInstanceOf(Mesh)

  //   const mesh = rootGroup.children[0] as Mesh
  //   expect(mesh.position).toStrictEqual(position)
  //   expect(mesh.geometry).toBeInstanceOf(BufferGeometry)
  //   expect(mesh.material).toBeInstanceOf(MeshBasicMaterial)
  // })
})
