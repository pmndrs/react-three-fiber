import React, { useMemo } from 'react'
import * as THREE from 'three'

import { Setup } from '../Setup'
import { useTurntable } from '../useTurntable'

import { Extrude } from '../../src/shapes'

export default {
  title: 'Shapes/Extrude',
  component: Extrude,
  decorators: [(storyFn) => <Setup cameraPosition={[-30, 30, 30]}>{storyFn()}</Setup>],
}

function ExtrudeScene() {
  const shape = useMemo(() => {
    const _shape = new THREE.Shape()

    const width = 8,
      length = 12

    _shape.moveTo(0, 0)
    _shape.lineTo(0, width)
    _shape.lineTo(length, width)
    _shape.lineTo(length, 0)
    _shape.lineTo(0, 0)

    return _shape
  }, [])

  const extrudeSettings = useMemo(
    () => ({
      steps: 2,
      depth: 16,
      bevelEnabled: true,
      bevelThickness: 1,
      bevelSize: 1,
      bevelOffset: 0,
      bevelSegments: 1,
    }),
    []
  )

  const ref = useTurntable()

  return (
    <>
      <Extrude ref={ref} args={[shape, extrudeSettings]}>
        <meshPhongMaterial attach="material" color="#f3f3f3" wireframe />
      </Extrude>
    </>
  )
}

export const ExtrudeSt = () => <ExtrudeScene />
ExtrudeSt.storyName = 'Default'
