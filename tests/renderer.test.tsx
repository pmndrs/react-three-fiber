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

  describe('attach props', () => {
    test('object with array path', () => {
      const rootGroup = new Group()
      const testObject = { test: 'test' }

      render(
        <mesh>
          <shaderMaterial attach="material">
            <primitive object={testObject} attachObject={['uniforms', 'very', 'long', 'path']} />
          </shaderMaterial>
        </mesh>,
        rootGroup
      )

      const material = (rootGroup.children[0] as Mesh).material as any
      expect(material.uniforms.very.long.path).toBe(testObject)
    })

    test('object with string path', () => {
      const rootGroup = new Group()
      const testObject = { test: 'test' }

      render(
        <mesh>
          <shaderMaterial attach="material">
            <primitive object={testObject} attachObject="uniforms" />
          </shaderMaterial>
        </mesh>,
        rootGroup
      )

      const material = (rootGroup.children[0] as Mesh).material as any
      expect(material.uniforms).toBe(testObject)
    })

    test('array with array path', () => {
      const rootGroup = new Group()
      const testObject = { test: 'test' }

      render(
        <mesh>
          <shaderMaterial attach="material">
            <primitive object={testObject} attachArray={['uniforms', 'very', 'long', 'path']} />
          </shaderMaterial>
        </mesh>,
        rootGroup
      )

      const material = (rootGroup.children[0] as Mesh).material as any
      expect(material.uniforms.very.long.path).toEqual([testObject])
    })

    test('array with string path', () => {
      const rootGroup = new Group()
      const testObject = { test: 'test' }

      render(
        <mesh>
          <shaderMaterial attach="material">
            <primitive object={testObject} attachArray="uniforms" />
          </shaderMaterial>
        </mesh>,
        rootGroup
      )

      const material = (rootGroup.children[0] as Mesh).material as any
      expect(material.uniforms).toEqual([testObject])
    })

    test('array order', () => {
      const rootGroup = new Group()
      const testObject1 = { test: 'test1' }
      const testObject2 = { test: 'test2' }

      render(
        <mesh>
          <shaderMaterial attach="material">
            <primitive object={testObject1} attachArray="uniforms" />
            <primitive object={testObject2} attachArray="uniforms" />
          </shaderMaterial>
        </mesh>,
        rootGroup
      )

      const material = (rootGroup.children[0] as Mesh).material as any
      expect(material.uniforms).toEqual([testObject1, testObject2])
    })
  })
})
