import * as React from 'react'
import * as THREE from 'three'
import { useLoader, type ThreeElements } from '../src'

// Type-level regressions; enforced by `yarn typecheck`.

// https://github.com/pmndrs/react-three-fiber/issues/3898
// Non-constructor three exports (constants, MathUtils, ...) must not become intrinsic elements with `never` props,
// otherwise rendering a React.ElementType resolves its props to `never`.
function Polymorphic({ as: Component, size }: { as: React.ElementType; size?: number }) {
  return <Component size={size} />
}

function PolymorphicNoProps({ as: Component }: { as: React.ElementType }) {
  return <Component />
}

// @ts-expect-error
type NoConstants = ThreeElements['aCESFilmicToneMapping']
// @ts-expect-error
type NoNamespaces = ThreeElements['mathUtils']

function Elements() {
  return (
    <>
      <mesh position={[1, 2, 3]} />
      <meshStandardMaterial color="red" />
      <threeLine />
      <primitive object={{}} />
    </>
  )
}

function ReadonlyLoaderResults() {
  const tuple = useLoader(THREE.TextureLoader, ['first.png', 'second.png'] as const)
  const first: THREE.Texture = tuple[0]
  const second: THREE.Texture = tuple[1]
  const urls: readonly string[] = ['third.png']
  const list: THREE.Texture[] = useLoader(THREE.TextureLoader, urls)
  const mutable: THREE.Texture[] = useLoader(THREE.TextureLoader, ['fourth.png'])
  const single: THREE.Texture = useLoader(THREE.TextureLoader, 'fifth.png')
  return [first, second, list, mutable, single]
}

describe('types', () => {
  it('compiles', () => {
    expect([Polymorphic, PolymorphicNoProps, Elements, ReadonlyLoaderResults]).toHaveLength(4)
  })
})
