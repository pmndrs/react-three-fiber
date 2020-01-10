import React from 'react'
import TestRenderer from 'react-test-renderer'

import { Mesh, BoxBufferGeometry, MeshNormalMaterial, Line, New, Primitive } from '.'

describe('components', () => {
  test('mesh example matches snapshot', () => {
    expect(
      TestRenderer.create(
        <Mesh
          onUpdate={mesh => console.log(mesh.geometry)}
          onClick={() => console.log('click')}
          onPointerOver={() => console.log('hover')}
          onPointerOut={() => console.log('unhover')}>
          <BoxBufferGeometry attach="geometry" args={[1, 1, 1]} />
          <MeshNormalMaterial attach="material" />
        </Mesh>
      )
    ).toMatchSnapshot()
  })

  test('components.Line can be used instead of line instrinsic element', () => {
    const actual = TestRenderer.create(<Line />).toJSON()
    const expected = TestRenderer.create(<line />).toJSON()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(actual).toStrictEqual(expected!)
  })

  test('Primitive matches snapshot', () => {
    const object = { a: 10, b: 20 }
    expect(TestRenderer.create(<Primitive object={object} a={30} />)).toMatchSnapshot()
  })

  test('New matches snapshot', () => {
    class SpecialThing {
      constructor(public foo: number, _: string) {}
    }

    expect(TestRenderer.create(<New object={SpecialThing} args={[5, 'bar']} foo={2} />)).toMatchSnapshot()
  })
})
