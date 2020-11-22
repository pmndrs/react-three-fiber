import * as React from 'react'
import * as TestRenderer from 'react-test-renderer'
import * as THREE from 'three'

import { Mesh, BoxBufferGeometry, MeshNormalMaterial, Line, New, Primitive } from '../src/components'

function onUpdate(mesh: THREE.Mesh<THREE.Geometry | THREE.BufferGeometry, THREE.Material | THREE.Material[]>) {
  console.log(mesh.geometry)
}
function onClick() {
  console.log('click')
}
function onPointerOver() {
  console.log('hover')
}
function onPointerOut() {
  console.log('unhover')
}

const args: [number, number, number] = [1, 1, 1]
const args2: [number, string] = [5, 'bar']

const object = { a: 10, b: 20 }

describe('components', () => {
  test('mesh example matches snapshot', () => {
    expect(
      TestRenderer.create(
        <Mesh onUpdate={onUpdate} onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
          <BoxBufferGeometry args={args} />
          <MeshNormalMaterial />
        </Mesh>
      )
    ).toMatchSnapshot()
  })

  test('components.Line can be used instead of line intrinsic element', () => {
    const actual = TestRenderer.create(<Line />).toJSON()
    const expected = TestRenderer.create(<line />).toJSON()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(actual).toStrictEqual(expected!)
  })

  test('Primitive matches snapshot', () => {
    expect(TestRenderer.create(<Primitive object={object} a={30} />)).toMatchSnapshot()
  })

  test('New matches snapshot', () => {
    class SpecialThing {
      constructor(public foo: number, _: string) {}
    }
    expect(TestRenderer.create(<New object={SpecialThing} args={args2} foo={2} />)).toMatchSnapshot()
  })
})
