import { MockScene, MockSceneChild } from '../createMockStore'

import { lowerCaseFirstLetter } from './strings'

interface ReactThreeTestRendererTreeNode {
  type: string
  props: {
    [key: string]: any
  }
  children: ReactThreeTestRendererTreeNode[]
}

export type ReactThreeTestRendererTree = ReactThreeTestRendererTreeNode

const treeObjectFactory = (
  type: ReactThreeTestRendererTreeNode['type'],
  props: ReactThreeTestRendererTreeNode['props'],
  children: ReactThreeTestRendererTreeNode['children'],
): ReactThreeTestRendererTreeNode => ({
  type,
  props,
  children,
})

const toTreeBranch = (obj: MockSceneChild[]): ReactThreeTestRendererTreeNode[] =>
  obj.map((child) => {
    return treeObjectFactory(
      lowerCaseFirstLetter(child.type || child.constructor.name),
      { ...child.__r3f.memoizedProps },
      toTreeBranch([...(child.children || []), ...child.__r3f.objects]),
    )
  })

export const toTree = (scene: MockScene): ReactThreeTestRendererTree => ({
  type: 'scene',
  props: {},
  children: scene.children.map((obj) =>
    treeObjectFactory(
      lowerCaseFirstLetter(obj.type),
      { ...obj.__r3f.memoizedProps },
      toTreeBranch([...obj.children, ...obj.__r3f.objects]),
    ),
  ),
})
