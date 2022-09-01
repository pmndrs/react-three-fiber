import type { Instance } from '@react-three/fiber'
import type { SceneGraphItem } from '../types/public'

const graphObjectFactory = (
  type: SceneGraphItem['type'],
  name: SceneGraphItem['name'],
  children: SceneGraphItem['children'],
): SceneGraphItem => ({
  type,
  name,
  children,
})

export const toGraph = (object: Instance): SceneGraphItem[] =>
  object.children.map((child) => graphObjectFactory(child.object.type, child.object.name ?? '', toGraph(child)))
