import { Fn, vec2, float, floor, fract, length, min, sin, dot, Loop } from 'three/tsl'

const random2 = Fn(([p]) => {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))).mul(43758.5453))
})

export const worleyNoise = Fn(([p]) => {
  const i = floor(p).toVar()
  const f = fract(p).toVar()

  const minDist = float(1).toVar()

  Loop({ start: -1, end: 2, type: 'int' }, ({ i: x }) => {
    Loop({ start: -1, end: 2, type: 'int' }, ({ i: y }) => {
      const neighbor = vec2(float(x), float(y))
      const point = random2(i.add(neighbor))
      const diff = neighbor.add(point).sub(f)
      const dist = length(diff)

      minDist.assign(min(minDist, dist))
    })
  })

  return minDist
})
