interface ReactThreeTestRendererSceneGraphItem {
  type: string
  name: string
  children: ReactThreeTestRendererSceneGraphItem[] | null
}

export type ReactThreeTestRendererSceneGraph = ReactThreeTestRendererSceneGraphItem[]

const graphObjectFactory = (
  type: ReactThreeTestRendererSceneGraphItem['type'],
  name: ReactThreeTestRendererSceneGraphItem['name'],
  children: ReactThreeTestRendererSceneGraphItem['children'],
): ReactThreeTestRendererSceneGraphItem => ({
  type,
  name,
  children,
})

export const toGraph = (object: THREE.Object3D): ReactThreeTestRendererSceneGraphItem[] =>
  object.children.map((child) => graphObjectFactory(child.type, child.name || '', toGraph(child)))
