import {
  Mesh,
  BoxBufferGeometry,
  PlaneBufferGeometry,
  CylinderBufferGeometry,
  ConeBufferGeometry,
  CircleBufferGeometry,
  SphereBufferGeometry,
} from 'three'
import React, { forwardRef } from 'react'

type BoxProps = JSX.IntrinsicElements['mesh'] & {
  args?: ConstructorParameters<typeof BoxBufferGeometry>
}

type CircleProps = JSX.IntrinsicElements['mesh'] & {
  args?: ConstructorParameters<typeof CircleBufferGeometry>
}

type ConeProps = JSX.IntrinsicElements['mesh'] & {
  args?: ConstructorParameters<typeof ConeBufferGeometry>
}

type CylinderProps = JSX.IntrinsicElements['mesh'] & {
  args?: ConstructorParameters<typeof CylinderBufferGeometry>
}

type SphereProps = JSX.IntrinsicElements['mesh'] & {
  args?: ConstructorParameters<typeof SphereBufferGeometry>
}

type PlaneProps = JSX.IntrinsicElements['mesh'] & {
  args?: ConstructorParameters<typeof PlaneBufferGeometry>
}

export const Box = forwardRef(({ args, children, ...props }: BoxProps, ref) => {
  return (
    <mesh ref={ref as React.MutableRefObject<Mesh>} {...props}>
      <boxBufferGeometry attach="geometry" args={args} />
      {children}
    </mesh>
  )
})

export const Circle = forwardRef(({ args, children, ...props }: CircleProps, ref) => {
  return (
    <mesh ref={ref as React.MutableRefObject<Mesh>} {...props}>
      <circleBufferGeometry attach="geometry" args={args} />
      {children}
    </mesh>
  )
})

export const Cone = forwardRef(({ args, children, ...props }: ConeProps, ref) => {
  return (
    <mesh ref={ref as React.MutableRefObject<Mesh>} {...props}>
      <coneBufferGeometry attach="geometry" args={args} />
      {children}
    </mesh>
  )
})

export const Cylinder = forwardRef(({ args, children, ...props }: CylinderProps, ref) => {
  return (
    <mesh ref={ref as React.MutableRefObject<Mesh>} {...props}>
      <cylinderBufferGeometry attach="geometry" args={args} />
      {children}
    </mesh>
  )
})

export const Sphere = forwardRef(({ args, children, ...props }: SphereProps, ref) => {
  return (
    <mesh ref={ref as React.MutableRefObject<Mesh>} {...props}>
      <sphereBufferGeometry attach="geometry" args={args} />
      {children}
    </mesh>
  )
})

export const Plane = forwardRef(({ args, children, ...props }: PlaneProps, ref) => {
  return (
    <mesh ref={ref as React.MutableRefObject<Mesh>} {...props}>
      <planeBufferGeometry attach="geometry" args={args} />
      {children}
    </mesh>
  )
})
