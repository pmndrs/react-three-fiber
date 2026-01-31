/**
 * Smooth F1 Worley noise — matches Blender's "Smooth F1" Voronoi mode.
 *
 * Copied from the MX noise internals with renamed WGSL layout names (sm_ prefix)
 * to avoid redeclaration conflicts with the built-in mx_worley_noise_float.
 */
import {
  int,
  uint,
  float,
  vec3,
  bool,
  Fn,
  select,
  floor,
  abs,
  max,
  dot,
  min,
  sqrt,
  If,
  Loop,
  overloadingFn,
} from 'three/tsl'

// --- Renamed MX internals (sm_ prefix to avoid WGSL conflicts) ---

const sm_rotl32 = Fn(([x_immutable, k_immutable]) => {
  const k = int(k_immutable).toVar()
  const x = uint(x_immutable).toVar()
  return x.shiftLeft(k).bitOr(x.shiftRight(int(32).sub(k)))
}).setLayout({
  name: 'sm_rotl32',
  type: 'uint',
  inputs: [
    { name: 'x', type: 'uint' },
    { name: 'k', type: 'int' },
  ],
})

const sm_bjmix = Fn(([a, b, c]) => {
  a.subAssign(c)
  a.bitXorAssign(sm_rotl32(c, int(4)))
  c.addAssign(b)
  b.subAssign(a)
  b.bitXorAssign(sm_rotl32(a, int(6)))
  a.addAssign(c)
  c.subAssign(b)
  c.bitXorAssign(sm_rotl32(b, int(8)))
  b.addAssign(a)
  a.subAssign(c)
  a.bitXorAssign(sm_rotl32(c, int(16)))
  c.addAssign(b)
  b.subAssign(a)
  b.bitXorAssign(sm_rotl32(a, int(19)))
  a.addAssign(c)
  c.subAssign(b)
  c.bitXorAssign(sm_rotl32(b, int(4)))
  b.addAssign(a)
})

const sm_bjfinal = Fn(([a_immutable, b_immutable, c_immutable]) => {
  const c = uint(c_immutable).toVar()
  const b = uint(b_immutable).toVar()
  const a = uint(a_immutable).toVar()
  c.bitXorAssign(b)
  c.subAssign(sm_rotl32(b, int(14)))
  a.bitXorAssign(c)
  a.subAssign(sm_rotl32(c, int(11)))
  b.bitXorAssign(a)
  b.subAssign(sm_rotl32(a, int(25)))
  c.bitXorAssign(b)
  c.subAssign(sm_rotl32(b, int(16)))
  a.bitXorAssign(c)
  a.subAssign(sm_rotl32(c, int(4)))
  b.bitXorAssign(a)
  b.subAssign(sm_rotl32(a, int(14)))
  c.bitXorAssign(b)
  c.subAssign(sm_rotl32(b, int(24)))
  return c
}).setLayout({
  name: 'sm_bjfinal',
  type: 'uint',
  inputs: [
    { name: 'a', type: 'uint' },
    { name: 'b', type: 'uint' },
    { name: 'c', type: 'uint' },
  ],
})

const sm_bits_to_01 = Fn(([bits_immutable]) => {
  const bits = uint(bits_immutable).toVar()
  return float(bits).div(float(uint(int(0xffffffff))))
}).setLayout({
  name: 'sm_bits_to_01',
  type: 'float',
  inputs: [{ name: 'bits', type: 'uint' }],
})

const sm_floor = Fn(([x_immutable]) => {
  const x = float(x_immutable).toVar()
  return int(floor(x))
}).setLayout({
  name: 'sm_floor',
  type: 'int',
  inputs: [{ name: 'x', type: 'float' }],
})

const sm_floorfrac = Fn(([x_immutable, i]) => {
  const x = float(x_immutable).toVar()
  i.assign(sm_floor(x))
  return x.sub(float(i))
})

// hash_int overloads

const sm_hash_int_0 = Fn(([x_immutable]) => {
  const x = int(x_immutable).toVar()
  const len = uint(uint(1)).toVar()
  const seed = uint(
    uint(int(0xdeadbeef))
      .add(len.shiftLeft(uint(2)))
      .add(uint(13)),
  ).toVar()
  return sm_bjfinal(seed.add(uint(x)), seed, seed)
}).setLayout({
  name: 'sm_hash_int_0',
  type: 'uint',
  inputs: [{ name: 'x', type: 'int' }],
})

const sm_hash_int_1 = Fn(([x_immutable, y_immutable]) => {
  const y = int(y_immutable).toVar()
  const x = int(x_immutable).toVar()
  const len = uint(uint(2)).toVar()
  const a = uint().toVar(),
    b = uint().toVar(),
    c = uint().toVar()
  a.assign(
    b.assign(
      c.assign(
        uint(int(0xdeadbeef))
          .add(len.shiftLeft(uint(2)))
          .add(uint(13)),
      ),
    ),
  )
  a.addAssign(uint(x))
  b.addAssign(uint(y))
  return sm_bjfinal(a, b, c)
}).setLayout({
  name: 'sm_hash_int_1',
  type: 'uint',
  inputs: [
    { name: 'x', type: 'int' },
    { name: 'y', type: 'int' },
  ],
})

const sm_hash_int_2 = Fn(([x_immutable, y_immutable, z_immutable]) => {
  const z = int(z_immutable).toVar()
  const y = int(y_immutable).toVar()
  const x = int(x_immutable).toVar()
  const len = uint(uint(3)).toVar()
  const a = uint().toVar(),
    b = uint().toVar(),
    c = uint().toVar()
  a.assign(
    b.assign(
      c.assign(
        uint(int(0xdeadbeef))
          .add(len.shiftLeft(uint(2)))
          .add(uint(13)),
      ),
    ),
  )
  a.addAssign(uint(x))
  b.addAssign(uint(y))
  c.addAssign(uint(z))
  return sm_bjfinal(a, b, c)
}).setLayout({
  name: 'sm_hash_int_2',
  type: 'uint',
  inputs: [
    { name: 'x', type: 'int' },
    { name: 'y', type: 'int' },
    { name: 'z', type: 'int' },
  ],
})

const sm_hash_int_3 = Fn(([x_immutable, y_immutable, z_immutable, xx_immutable]) => {
  const xx = int(xx_immutable).toVar()
  const z = int(z_immutable).toVar()
  const y = int(y_immutable).toVar()
  const x = int(x_immutable).toVar()
  const len = uint(uint(4)).toVar()
  const a = uint().toVar(),
    b = uint().toVar(),
    c = uint().toVar()
  a.assign(
    b.assign(
      c.assign(
        uint(int(0xdeadbeef))
          .add(len.shiftLeft(uint(2)))
          .add(uint(13)),
      ),
    ),
  )
  a.addAssign(uint(x))
  b.addAssign(uint(y))
  c.addAssign(uint(z))
  sm_bjmix(a, b, c)
  a.addAssign(uint(xx))
  return sm_bjfinal(a, b, c)
}).setLayout({
  name: 'sm_hash_int_3',
  type: 'uint',
  inputs: [
    { name: 'x', type: 'int' },
    { name: 'y', type: 'int' },
    { name: 'z', type: 'int' },
    { name: 'xx', type: 'int' },
  ],
})

const sm_hash_int = overloadingFn([sm_hash_int_0, sm_hash_int_1, sm_hash_int_2, sm_hash_int_3])

// cell noise vec3 (3D overload only — the one worley_distance uses)

const sm_cell_noise_vec3 = Fn(([p_immutable]) => {
  const p = vec3(p_immutable).toVar()
  const ix = int(sm_floor(p.x)).toVar()
  const iy = int(sm_floor(p.y)).toVar()
  const iz = int(sm_floor(p.z)).toVar()
  return vec3(
    sm_bits_to_01(sm_hash_int(ix, iy, iz, int(0))),
    sm_bits_to_01(sm_hash_int(ix, iy, iz, int(1))),
    sm_bits_to_01(sm_hash_int(ix, iy, iz, int(2))),
  )
}).setLayout({
  name: 'sm_cell_noise_vec3',
  type: 'vec3',
  inputs: [{ name: 'p', type: 'vec3' }],
})

// worley distance (3D overload only)

const sm_worley_distance = Fn(
  ([
    p_immutable,
    x_immutable,
    y_immutable,
    z_immutable,
    xoff_immutable,
    yoff_immutable,
    zoff_immutable,
    jitter_immutable,
    metric_immutable,
  ]) => {
    const metric = int(metric_immutable).toVar()
    const jitter = float(jitter_immutable).toVar()
    const zoff = int(zoff_immutable).toVar()
    const yoff = int(yoff_immutable).toVar()
    const xoff = int(xoff_immutable).toVar()
    const z = int(z_immutable).toVar()
    const y = int(y_immutable).toVar()
    const x = int(x_immutable).toVar()
    const p = vec3(p_immutable).toVar()
    const off = vec3(sm_cell_noise_vec3(vec3(x.add(xoff), y.add(yoff), z.add(zoff)))).toVar()
    off.subAssign(0.5)
    off.mulAssign(jitter)
    off.addAssign(0.5)
    const cellpos = vec3(vec3(float(x), float(y), float(z)).add(off)).toVar()
    const diff = vec3(cellpos.sub(p)).toVar()

    If(metric.equal(int(2)), () => {
      return abs(diff.x).add(abs(diff.y)).add(abs(diff.z))
    })

    If(metric.equal(int(3)), () => {
      return max(abs(diff.x), abs(diff.y), abs(diff.z))
    })

    return dot(diff, diff)
  },
).setLayout({
  name: 'sm_worley_distance',
  type: 'float',
  inputs: [
    { name: 'p', type: 'vec3' },
    { name: 'x', type: 'int' },
    { name: 'y', type: 'int' },
    { name: 'z', type: 'int' },
    { name: 'xoff', type: 'int' },
    { name: 'yoff', type: 'int' },
    { name: 'zoff', type: 'int' },
    { name: 'jitter', type: 'float' },
    { name: 'metric', type: 'int' },
  ],
})

// --- Smooth min ---

const smoothMin = Fn(([a, b, k]) => {
  const ea = a.negate().mul(k).exp()
  const eb = b.negate().mul(k).exp()
  return ea.add(eb).log().negate().div(k)
}).setLayout({
  name: 'sm_smooth_min',
  type: 'float',
  inputs: [
    { name: 'a', type: 'float' },
    { name: 'b', type: 'float' },
    { name: 'k', type: 'float' },
  ],
})

// --- Smooth F1 Worley ---

/**
 * Smooth F1 Worley noise.
 * Identical cell layout to mx_worley_noise_float but with exponential smooth min.
 *
 * @param p - vec3 coordinate
 * @param smoothness - smooth min strength (try 2–8; lower = wider edges)
 */
export const mx_worley_noise_float_smooth = Fn(([p_immutable, smoothness_immutable]) => {
  const smoothness = float(smoothness_immutable).toVar()
  const p = vec3(p_immutable).toVar()
  const X = int().toVar(),
    Y = int().toVar(),
    Z = int().toVar()
  const localpos = vec3(sm_floorfrac(p.x, X), sm_floorfrac(p.y, Y), sm_floorfrac(p.z, Z)).toVar()
  const sqdist = float(3.2).toVar()

  Loop({ start: -1, end: int(1), name: 'x', condition: '<=' }, ({ x }) => {
    Loop({ start: -1, end: int(1), name: 'y', condition: '<=' }, ({ y }) => {
      Loop({ start: -1, end: int(1), name: 'z', condition: '<=' }, ({ z }) => {
        const dist = sqrt(float(sm_worley_distance(localpos, x, y, z, X, Y, Z, float(1), int(0)))).toVar()
        sqdist.assign(smoothMin(sqdist, dist, smoothness))
      })
    })
  })

  return sqdist
}).setLayout({
  name: 'mx_worley_noise_float_smooth',
  type: 'float',
  inputs: [
    { name: 'p', type: 'vec3' },
    { name: 'smoothness', type: 'float' },
  ],
})
