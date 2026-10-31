// A program that loads both the default and the /legacy entries: their ambient JSX maps merge into
// one IntrinsicElements, so every shared member they contribute must be identical.
import type * as React from 'react'
import type { ThreeElement, ThreeElements as DefaultThreeElements } from '../../packages/fiber/dist/index'
import type { ThreeElements as LegacyThreeElements } from '../../packages/fiber/dist/legacy'
import { Canvas } from '../../packages/fiber/dist/index'
import { createRoot } from '../../packages/fiber/dist/legacy'
import { Group } from 'three'

type Assert<T extends true> = T

class CustomThing extends Group {}

declare module '../../packages/fiber/dist/index' {
  interface ThreeElements {
    customThing: ThreeElement<typeof CustomThing>
  }
}

type HasMeshElement = Assert<'mesh' extends keyof DefaultThreeElements ? true : false>
type KeepsPMREMOnDefault = Assert<'pMREMGenerator' extends keyof DefaultThreeElements ? true : false>
type KeepsPMREMOnLegacy = Assert<'pMREMGenerator' extends keyof LegacyThreeElements ? true : false>
type AugmentsThroughJSX = Assert<'customThing' extends keyof React.JSX.IntrinsicElements ? true : false>

const mesh: DefaultThreeElements['mesh'] = { position: [1, 2, 3] }
const legacyMesh: LegacyThreeElements['mesh'] = mesh

void Canvas
void createRoot(document.createElement('canvas')).configure({ scheduler: { fps: 30 } })

export function Scene() {
  return (
    <group>
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d0d0d0" />
      </mesh>
      <customThing />
    </group>
  )
}

void [mesh, legacyMesh]

export type { HasMeshElement, KeepsPMREMOnDefault, KeepsPMREMOnLegacy, AugmentsThroughJSX }
