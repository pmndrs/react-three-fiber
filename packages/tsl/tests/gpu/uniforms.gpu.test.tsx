/**
 * TSL uniforms drive real shader output (Tier 3).
 *
 * `hooks.test.tsx` and `webgpu-hooks-lifecycle.test.tsx` check the uniform nodes `useUniforms`
 * creates and updates, against a mock. This compiles a node material that reads one on a real
 * device and checks that writing `.value` changes the pixels, with no re-render and no recompile.
 */
import * as React from 'react'
import * as THREE from 'three/webgpu'
import { useUniforms } from '@react-three/tsl'

import { BLUE, RED, centrePixel, cleanup, expectColor, mount } from '../../../fiber/tests/gpu/harness'

afterEach(cleanup)

describe('useUniforms on a real device', () => {
  it('recolours a node material when the uniform value changes', async () => {
    let tint!: { value: THREE.Color }
    let renders = 0

    function Tinted() {
      renders++
      const uniforms = useUniforms({ tint: new THREE.Color('red') })
      tint = uniforms.tint
      return (
        <mesh>
          <planeGeometry args={[2, 2]} />
          <meshBasicNodeMaterial colorNode={uniforms.tint} />
        </mesh>
      )
    }

    const { canvas, frame } = await mount(<Tinted />)
    frame()
    expectColor(await centrePixel(canvas), RED)

    const rendersBefore = renders
    tint.value.set('blue')
    frame()

    expectColor(await centrePixel(canvas), BLUE)
    expect(renders).toBe(rendersBefore)
  })

  it('reads the uniform from the primary store on a secondary canvas', async () => {
    let tint!: { value: THREE.Color }

    function Tinted() {
      const uniforms = useUniforms({ sharedTint: new THREE.Color('red') })
      tint = uniforms.sharedTint
      return (
        <mesh>
          <planeGeometry args={[2, 2]} />
          <meshBasicNodeMaterial colorNode={uniforms.sharedTint} />
        </mesh>
      )
    }

    const primary = await mount(<Tinted />, { primary: true })
    const firstTint = tint
    const secondary = await mount(<Tinted />)
    // Resources live on the primary, so both canvases hold the same node
    expect(tint).toBe(firstTint)

    tint.value.set('blue')
    primary.frame()
    secondary.frame()

    expectColor(await centrePixel(primary.canvas), BLUE)
    expectColor(await centrePixel(secondary.canvas), BLUE)
  })
})
