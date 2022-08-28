import { Node } from '@react-three/fiber'
import { OrbitControls } from 'three-stdlib'
import { DotMaterial } from '../src/demos/Pointcloud'

declare module '@react-three/fiber' {
  interface ThreeElements {
    orbitControls: Node<typeof OrbitControls>
    dotMaterial: Node<typeof DotMaterial>
  }
}
