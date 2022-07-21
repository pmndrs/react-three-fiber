import type { TreeNode, Tree } from '../types/public'
import type { MockInstance } from '../types/internal'
import { lowerCaseFirstLetter } from './strings'

const treeObjectFactory = (
  type: TreeNode['type'],
  props: TreeNode['props'],
  children: TreeNode['children'],
): TreeNode => ({
  type,
  props,
  children,
})

const toTreeBranch = (children: MockInstance[]): TreeNode[] =>
  children.map((child) => {
    return treeObjectFactory(
      lowerCaseFirstLetter(child.object.type || child.object.constructor.name),
      child.props,
      toTreeBranch(child.children),
    )
  })

export const toTree = (root: MockInstance<THREE.Scene>): Tree => toTreeBranch(root.children)
