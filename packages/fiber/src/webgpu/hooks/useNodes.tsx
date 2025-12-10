import { useMemo } from 'react'
import { useStore } from '../../core/hooks'
import type { RootState } from '#types'

//* Types ==============================

export type TSLNode = {
  // TSL nodes have various properties depending on type
  label?: (name: string) => TSLNode
  [key: string]: any
}

export type NodeRecord = Record<string, TSLNode>
export type NodeCreator<T extends NodeRecord> = (state: RootState) => T

/** Default scope for nodes without explicit scope */
export const DEFAULT_NODE_SCOPE = '_'

//* Hook Overloads ==============================

// Get all nodes (returns full scoped structure)
export function useNodes(): Record<string, NodeRecord>

// Get nodes from a specific scope
export function useNodes(scope: string): NodeRecord

// Create/get nodes with optional scope
export function useNodes<T extends NodeRecord>(creator: NodeCreator<T>, scope?: string): T

//* Hook Implementation ==============================

/**
 * Hook for managing global TSL nodes with create-if-not-exists pattern.
 *
 * Nodes are organized by scope for namespacing. Default scope is '_'.
 * When a creator function is provided, nodes are created if they don't exist.
 * Can store any TSL node: attributes, varyings, operations, functions, etc.
 *
 * @example
 * ```tsx
 * import { attribute, varying, vec3, sin, cos, time, positionLocal } from 'three/tsl'
 *
 * // Create nodes (only created once, retrieved on subsequent calls)
 * const { wobble, vWorldPos } = useNodes(() => ({
 *   wobble: sin(time.mul(2)),
 *   vWorldPos: varying(vec3()),
 * }))
 *
 * // Create scoped nodes
 * const { playerOffset } = useNodes(() => ({
 *   playerOffset: attribute('offset', 'vec3'),
 * }), 'player')
 *
 * // Access existing nodes from default scope
 * const { wobble } = useNodes('_')
 *
 * // Access existing nodes from a specific scope
 * const playerNodes = useNodes('player')
 *
 * // Get all nodes (all scopes)
 * const allNodes = useNodes()
 * // allNodes = { _: { wobble, vWorldPos }, player: { playerOffset } }
 *
 * // Use in material
 * material.positionNode = positionLocal.add(normal.mul(wobble))
 * ```
 */
export function useNodes<T extends NodeRecord>(
  creatorOrScope?: NodeCreator<T> | string,
  scope?: string,
): T | NodeRecord | Record<string, NodeRecord> {
  const store = useStore()

  return useMemo(() => {
    const state = store.getState()
    const set = store.setState

    // Case 1: No arguments - return all nodes
    if (creatorOrScope === undefined) {
      return state.nodes
    }

    // Case 2: String argument - return nodes from that scope
    if (typeof creatorOrScope === 'string') {
      return state.nodes[creatorOrScope] ?? {}
    }

    // Case 3: Creator function - create if not exists
    const creator = creatorOrScope
    const targetScope = scope ?? DEFAULT_NODE_SCOPE

    // Run the creator to get the node definitions
    const created = creator(state)
    const result: Record<string, TSLNode> = {}

    // Ensure scope exists
    const currentScope = state.nodes[targetScope] ?? {}
    let hasNewNodes = false

    for (const [name, node] of Object.entries(created)) {
      // Check if node already exists in this scope
      if (currentScope[name]) {
        // Already exists - use existing
        result[name] = currentScope[name]
      } else {
        // Doesn't exist - add it
        // Apply label if the node supports it (for TSL debugging)
        if (typeof node.label === 'function') {
          const labelName = targetScope === DEFAULT_NODE_SCOPE ? name : `${targetScope}.${name}`
          node.label(labelName)
        }
        result[name] = node
        hasNewNodes = true
      }
    }

    // Update store if we created new nodes
    if (hasNewNodes) {
      set((s) => ({
        nodes: {
          ...s.nodes,
          [targetScope]: {
            ...s.nodes[targetScope],
            ...result,
          },
        },
      }))
    }

    return result as T
  }, [store, typeof creatorOrScope === 'string' ? creatorOrScope : scope])
}

//* Utility Functions ==============================

/**
 * Remove nodes by name from a scope
 */
export function removeNodes(
  set: ReturnType<typeof useStore>['setState'],
  names: string[],
  scope: string = DEFAULT_NODE_SCOPE,
) {
  set((state) => {
    const currentScope = { ...state.nodes[scope] }
    for (const name of names) {
      delete currentScope[name]
    }
    return {
      nodes: {
        ...state.nodes,
        [scope]: currentScope,
      },
    }
  })
}

/**
 * Clear all nodes from a scope
 */
export function clearNodeScope(set: ReturnType<typeof useStore>['setState'], scope: string = DEFAULT_NODE_SCOPE) {
  set((state) => {
    const { [scope]: _, ...rest } = state.nodes
    return { nodes: rest }
  })
}

export default useNodes
