import type { TreeNode, Tree } from '../types/public'
import type { MockSceneChild, MockScene } from '../types/internal'
import { lowerCaseFirstLetter } from './strings'
import { getMemoizedProps } from './testInstance'

const treeObjectFactory = (
  type: TreeNode['type'],
  props: TreeNode['props'],
  children: TreeNode['children'],
): TreeNode => ({
  type,
  props,
  children,
})

const toTreeBranch = (obj: MockSceneChild[]): TreeNode[] =>
  obj.map((child) => {
    return treeObjectFactory(
      lowerCaseFirstLetter(child.type || child.constructor.name),
      { ...getMemoizedProps(child) },
      toTreeBranch([...(child.children || []), ...child.__r3f.objects]),
    )
  })

export const toTree = (root: MockScene): Tree =>
  root.children.map((obj) =>
    treeObjectFactory(
      lowerCaseFirstLetter(obj.type),
      { ...getMemoizedProps(obj) },
      toTreeBranch([...(obj.children as MockSceneChild[]), ...(obj.__r3f.objects as MockSceneChild[])]),
    ),
  )
