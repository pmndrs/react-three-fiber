import {
  Mesh,
  BoxBufferGeometry,
  PlaneBufferGeometry,
  CylinderBufferGeometry,
  ConeBufferGeometry,
  CircleBufferGeometry,
  SphereBufferGeometry,
  TubeBufferGeometry,
  TorusBufferGeometry,
  TetrahedronBufferGeometry,
  RingBufferGeometry,
  PolyhedronBufferGeometry,
  OctahedronBufferGeometry,
  DodecahedronBufferGeometry,
  IcosahedronBufferGeometry,
  ExtrudeBufferGeometry,
  LatheBufferGeometry,
  ParametricBufferGeometry,
  TorusKnotBufferGeometry,
} from 'three'
import React, { forwardRef } from 'react'

function create<T>(type: any) {
  const El: any = type + 'bufferGeometry'
  return forwardRef(
    (
      {
        args,
        children,
        ...props
      }: JSX.IntrinsicElements['mesh'] & {
        args?: ConstructorParameters<typeof T>
      },
      ref
    ) => (
      <mesh ref={ref as React.MutableRefObject<Mesh>} {...props}>
        <El attach="geometry" args={args} />
        {children}
      </mesh>
    )
  )
}

export const Box = create<BoxBufferGeometry>('box')
export const Circle = create<CircleBufferGeometry>('circle')
export const Cone = create<ConeBufferGeometry>('cone')
export const Cylinder = create<CylinderBufferGeometry>('cylinder')
export const Sphere = create<SphereBufferGeometry>('sphere')
export const Plane = create<PlaneBufferGeometry>('plane')
export const Tube = create<TubeBufferGeometry>('tube')
export const Torus = create<TorusBufferGeometry>('torus')
export const TorusKnot = create<TorusKnotBufferGeometry>('torusKnot')
export const Tetrahedron = create<TetrahedronBufferGeometry>('tetrahedron')
export const Ring = create<RingBufferGeometry>('ring')
export const Polyhedron = create<PolyhedronBufferGeometry>('polyhedron')
export const Icosahedron = create<IcosahedronBufferGeometry>('icosahedron')
export const Octahedron = create<OctahedronBufferGeometry>('octahedron')
export const Dodecahedron = create<DodecahedronBufferGeometry>('dodecahedron')
export const Extrude = create<ExtrudeBufferGeometry>('extrude')
export const Lathe = create<LatheBufferGeometry>('lathe')
export const Parametric = create<ParametricBufferGeometry>('parametric')
