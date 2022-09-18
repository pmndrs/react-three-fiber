import { ThreeElement } from '@react-three/fiber'
import { OrbitControls } from 'three-stdlib'
import { DotMaterial } from '../src/demos/Pointcloud'

declare module '@react-three/fiber' {
  interface ThreeElements {
    orbitControls: ThreeElement<typeof OrbitControls>
    dotMaterial: ThreeElement<typeof DotMaterial>
  }
}
