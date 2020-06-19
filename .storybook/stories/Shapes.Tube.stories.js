import React, { useMemo } from 'react'
import * as THREE from 'three'

import { Setup } from '../Setup'
import { useTurntable } from '../useTurntable'

import { Tube } from '../../src/shapes'

export default {
  title: 'Shapes.Tube',
  component: Tube,
  decorators: [(storyFn) => <Setup cameraPosition={[-30, 30, 30]}>{storyFn()}</Setup>],
}

function TubeScene() {
  // curve example from https://threejs.org/docs/#api/en/geometries/TubeGeometry
  const path = useMemo(() => {
    function CustomSinCurve(scale) {
      THREE.Curve.call(this)

      this.scale = scale === undefined ? 1 : scale
    }

    CustomSinCurve.prototype = Object.create(THREE.Curve.prototype)
    CustomSinCurve.prototype.constructor = CustomSinCurve

    CustomSinCurve.prototype.getPoint = function (t) {
      var tx = t * 3 - 1.5
      var ty = Math.sin(2 * Math.PI * t)
      var tz = 0

      return new THREE.Vector3(tx, ty, tz).multiplyScalar(this.scale)
    }

    return new CustomSinCurve(10)
  }, [])

  console.log(path)

  const ref = useTurntable()

  return (
    <Tube ref={ref} args={[path]}>
      <meshPhongMaterial attach="material" color="#f3f3f3" wireframe />
    </Tube>
  )
}

export const TubeSt = () => <TubeScene />
TubeSt.storyName = 'Default'
