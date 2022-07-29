import { ReactThreeFiber } from '@react-three/fiber'
import { OrbitControls } from 'three-stdlib'

import { DotMaterial } from '../src/demos/Pointcloud'

declare module '@react-three/fiber' {
  interface ThreeElements {
    orbitControls: ReactThreeFiber.Node<OrbitControls, typeof OrbitControls>
    dotMaterial: ReactThreeFiber.MaterialNode<DotMaterial, typeof DotMaterial>
  }
}
