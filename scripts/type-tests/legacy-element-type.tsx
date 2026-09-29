/**
 * Typecheck-only regression for #3898: importing `@react-three/fiber/legacy` must not break JSX whose tag is a
 * `React.ElementType`.
 *
 * `ThreeToJSXElements` used to map every non-constructor three export (constants, functions,
 * namespaces) to a `never`-valued key in `JSX.IntrinsicElements`. React's `ElementType<any>`
 * unions every intrinsic key, and one `never`-valued member collapses the props of the whole
 * union, so `<IconComponent size={size} />` failed with "Type 'number' is not assignable to type
 * 'never'" in any app that merely imported the package.
 */
import type * as React from 'react'
import { Canvas, type ThreeElements } from '../../packages/fiber/dist/legacy'

type Assert<T extends true> = T
type NeverKeys<T> = { [K in keyof T]-?: [T[K]] extends [never] ? K : never }[keyof T]

// No intrinsic element is typed `never` ...
type NoNeverElements = Assert<[NeverKeys<ThreeElements>] extends [never] ? true : false>
// ... because non-constructor exports are filtered out instead of mapped to `never`.
type OmitsConstants = Assert<'noColorSpace' extends keyof ThreeElements ? false : true>
type OmitsNamespaces = Assert<'mathUtils' extends keyof ThreeElements ? false : true>
type KeepsConstructors = Assert<'mesh' extends keyof ThreeElements ? true : false>

type IconProps = {
  icon: React.ElementType
  size?: number
}

function Icon({ icon: IconComponent, size = 24 }: IconProps) {
  return <IconComponent size={size} />
}

function Scene() {
  return (
    <>
      <Icon icon="svg" size={32} />
      <Canvas>
        <group />
      </Canvas>
    </>
  )
}

void Scene

export type { KeepsConstructors, NoNeverElements, OmitsConstants, OmitsNamespaces }
