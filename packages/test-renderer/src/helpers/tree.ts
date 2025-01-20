import * as THREE from 'three'
import type { Instance } from '@react-three/fiber'
import type { TreeNode, Tree } from '../types/public'
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

const toTreeBranch = (children: Instance[]): TreeNode[] =>
  children.map((child) => {
    return treeObjectFactory(
      lowerCaseFirstLetter(child.object.type || child.object.constructor.name),
      child.props,
      toTreeBranch(child.children),
    )
  })

export const toTree = (root: Instance<THREE.Scene>): Tree => toTreeBranch(root.children)
