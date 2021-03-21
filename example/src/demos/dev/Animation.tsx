import * as THREE from 'three'
import React, { useState } from 'react'
import { Canvas, invalidate, addEffect, applyProps } from '@react-three/fiber'

import { FrameLoop, Globals, useSpring } from '@react-spring/core'
import { createHost } from '@react-spring/animated'
import { createStringInterpolator } from '@react-spring/shared/stringInterpolation'
import colorNames from '@react-spring/shared/colors'

const primitives = ['primitive'].concat(
  Object.keys(THREE)
    .filter((key) => /^[A-Z]/.test(key))
    .map((key) => key[0].toLowerCase() + key.slice(1)),
)

// Let r3f drive the frameloop.
const frameLoop = new FrameLoop(() => invalidate())
addEffect(() => (frameLoop.advance(), true))
Globals.assign({ createStringInterpolator, colorNames, frameLoop })
const host = createHost(primitives, { applyAnimatedValues: applyProps })
const a = host.animated

export default function Box(props: any) {
  const [active, setActive] = useState(0)
  // create a common spring that will be used later to interpolate other values
  const { spring } = useSpring({
    spring: active,
    config: { mass: 5, tension: 400, friction: 50, precision: 0.0001 },
  })
  // interpolate values from commong spring
  const scale = spring.to([0, 1], [1, 2])
  const rotation = spring.to([0, 1], [0, Math.PI])
  const color = spring.to([0, 1], ['#6246ea', '#e45858'])
  return (
    <Canvas>
      <a.mesh rotation-y={rotation} scale-x={scale} scale-z={scale} onClick={() => setActive(Number(!active))}>
        <boxBufferGeometry />
        <a.meshBasicMaterial color={color} />
      </a.mesh>
    </Canvas>
  )
}
