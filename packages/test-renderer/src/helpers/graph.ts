import type { MockScene, MockSceneChild } from '../types/internal'
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

export const toGraph = (object: MockScene | MockSceneChild): SceneGraphItem[] =>
  object.children.map((child) => graphObjectFactory(child.type, child.name || '', toGraph(child)))
