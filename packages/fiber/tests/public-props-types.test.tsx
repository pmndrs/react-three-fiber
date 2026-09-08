/**
 * Compile-time assertions for public prop types that strict consumers hit directly. Each block
 * is a shape that used to need a cast (`as any`, `as unknown as HTMLElement`, ...). The runtime
 * assertion is trivial; the value of this file is that `pnpm typecheck` compiles it.
 */
import * as React from 'react'
import * as THREE from 'three'
import { Canvas, extend, type ThreeEvent } from '../src'

extend(THREE)

class Custom extends THREE.Group {}

function typeAssertions() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const object = new THREE.Mesh()

  // raycaster params are merged at runtime, so a single threshold is a valid prop
  const raycaster = <Canvas raycaster={{ params: { Points: { threshold: 0.2 } }, near: 0.1 }} />

  // any Element that receives DOM events can be the event source, not only HTMLElement
  const eventSource = <Canvas eventSource={svg} />
  const eventSourceRef = <Canvas eventSource={React.createRef<SVGSVGElement>()} />

  // primitive keeps typed events and accepts arbitrary props for the wrapped object
  const primitive = (
    <primitive
      object={object}
      position={[0, 1, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => e.stopPropagation()}
      onPointerOver={(e) => e.stopPropagation()}
      customProp={42}
    />
  )

  // a whole namespace extends without a cast; a single class still yields a component
  extend(THREE)
  const Element = extend(Custom)
  const custom = <Element position={[0, 0, 0]} />

  return [raycaster, eventSource, eventSourceRef, primitive, custom]
}

void typeAssertions

describe('public prop declarations', () => {
  it('compile through source declarations', () => {
    expect(true).toBe(true)
  })
})
