import { useCallback, useMemo } from 'react'
import { useStore, useThree } from '../../core/hooks'
import type { RootState } from '#types'
import type { Node } from '#three'

//* Types ==============================

/** TSL node type - extends Three.js Node for material compatibility */
export type TSLNode = Node

export type NodeRecord<T extends Node = Node> = Record<string, T>
export type NodeCreator<T extends NodeRecord> = (state: RootState) => T

/** Function signature for removeNodes util */
export type RemoveNodesFn = (names: string | string[], scope?: string) => void

/** Function signature for clearNodes util */
export type ClearNodesFn = (scope?: string) => void

/** Return type with utils included */
export type NodesWithUtils<T extends NodeRecord = NodeRecord> = T & {
  removeNodes: RemoveNodesFn
  clearNodes: ClearNodesFn
}

/** Type guard to check if a value is a TSLNode vs a scope object */
const isTSLNode = (value: unknown): value is Node =>
  value !== null && typeof value === 'object' && ('uuid' in value || 'nodeType' in value)

//* Hook Overloads ==============================

// Get all nodes (returns full structure with root nodes and scopes + utils)
export function useNodes(): NodesWithUtils<NodeRecord & Record<string, NodeRecord>>

// Get nodes from a specific scope (+ utils)
export function useNodes(scope: string): NodesWithUtils

// Create/get nodes at root level (no scope) (+ utils)
export function useNodes<T extends NodeRecord>(creator: NodeCreator<T>): NodesWithUtils<T>

// Create/get nodes within a scope (+ utils)
export function useNodes<T extends NodeRecord>(creator: NodeCreator<T>, scope: string): NodesWithUtils<T>

//* Hook Implementation ==============================

/**
 * Hook for managing global TSL nodes with create-if-not-exists pattern.
 *
 * Nodes at root level are stored directly on state.nodes.
 * Scoped nodes are stored under state.nodes[scope].
 * Can store any TSL node: attributes, varyings, operations, functions, etc.
 *
 * @example
 * ```tsx
 * import { attribute, varying, vec3, sin, cos, time, positionLocal } from 'three/tsl'
 *
 * // Create root-level nodes (stored at state.nodes.wobble, etc.)
 * const { wobble, vWorldPos } = useNodes(() => ({
 *   wobble: sin(time.mul(2)),
 *   vWorldPos: varying(vec3()),
 * }))
 *
 * // Create scoped nodes (stored at state.nodes.player.playerOffset)
 * const { playerOffset } = useNodes(() => ({
 *   playerOffset: attribute('offset', 'vec3'),
 * }), 'player')
 *
 * // Access existing nodes from a specific scope
 * const playerNodes = useNodes('player')
 *
 * // Get all nodes (root + scopes)
 * const allNodes = useNodes()
 * // allNodes = { wobble, vWorldPos, player: { playerOffset } }
 *
 * // Use in material
 * material.positionNode = positionLocal.add(normal.mul(wobble))
 * ```
 */
export function useNodes<T extends NodeRecord>(
  creatorOrScope?: NodeCreator<T> | string,
  scope?: string,
): NodesWithUtils<T> | NodesWithUtils<NodeRecord> | NodesWithUtils<NodeRecord & Record<string, NodeRecord>> {
  const store = useStore()

  //* Utils ==============================
  // Memoized util functions that capture store reference

  /** Remove nodes by name from root or a scope */
  const removeNodes = useCallback<RemoveNodesFn>(
    (names, targetScope) => {
      const nameArray = Array.isArray(names) ? names : [names]
      store.setState((state) => {
        if (targetScope) {
          // Remove from scoped nodes
          const currentScope = { ...(state.nodes[targetScope] as NodeRecord) }
          for (const name of nameArray) delete currentScope[name]
          return { nodes: { ...state.nodes, [targetScope]: currentScope } }
        }
        // Remove from root level
        const nodes = { ...state.nodes }
        for (const name of nameArray) if (isTSLNode(nodes[name])) delete nodes[name]
        return { nodes }
      })
    },
    [store],
  )

  /** Clear nodes - scope name, 'root' for root only, or undefined for all */
  const clearNodes = useCallback<ClearNodesFn>(
    (targetScope) => {
      store.setState((state) => {
        // Clear specific scope
        if (targetScope && targetScope !== 'root') {
          const { [targetScope]: _, ...rest } = state.nodes
          return { nodes: rest }
        }
        // Clear root only (preserve scopes)
        if (targetScope === 'root') {
          const nodes: typeof state.nodes = {}
          for (const [key, value] of Object.entries(state.nodes)) {
            if (!isTSLNode(value)) nodes[key] = value
          }
          return { nodes }
        }
        // Clear everything
        return { nodes: {} }
      })
    },
    [store],
  )

  //* Main Logic ==============================

  const nodes = useMemo(() => {
    const state = store.getState()
    const set = store.setState

    // Case 1: No arguments - return all nodes (root + scopes)
    if (creatorOrScope === undefined) {
      return state.nodes as NodeRecord & Record<string, NodeRecord>
    }

    // Case 2: String argument - return nodes from that scope
    if (typeof creatorOrScope === 'string') {
      const scopeData = state.nodes[creatorOrScope]
      // Make sure we're returning a scope object, not a TSL node
      if (scopeData && !isTSLNode(scopeData)) return scopeData as NodeRecord
      return {}
    }

    // Case 3: Creator function - create if not exists
    const creator = creatorOrScope
    const created = creator(state)
    const result: Record<string, TSLNode> = {}
    let hasNewNodes = false

    // Scoped nodes ---------------------------------
    if (scope) {
      const currentScope = (state.nodes[scope] as NodeRecord) ?? {}

      for (const [name, node] of Object.entries(created)) {
        if (currentScope[name]) {
          result[name] = currentScope[name]
        } else {
          // Apply label for debugging
          if (typeof node.label === 'function') node.setName(`${scope}.${name}`)
          result[name] = node
          hasNewNodes = true
        }
      }

      if (hasNewNodes) {
        set((s) => ({
          nodes: {
            ...s.nodes,
            [scope]: { ...(s.nodes[scope] as NodeRecord), ...result },
          },
        }))
      }

      return result as T
    }

    // Root-level nodes ---------------------------------
    for (const [name, node] of Object.entries(created)) {
      const existing = state.nodes[name]
      if (existing && isTSLNode(existing)) {
        result[name] = existing
      } else {
        // Apply label for debugging
        if (typeof node.label === 'function') node.setName(name)
        result[name] = node
        hasNewNodes = true
      }
    }

    if (hasNewNodes) {
      set((s) => ({ nodes: { ...s.nodes, ...result } }))
    }

    return result as T
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, typeof creatorOrScope === 'string' ? creatorOrScope : scope])

  // Return nodes with utils
  return { ...nodes, removeNodes, clearNodes } as NodesWithUtils<T>
}

//* Standalone Utils (Deprecated) ==============================
// These require manual store access. Prefer the utils returned from useNodes() instead.

/**
 * Remove nodes by name from root level or a scope
 * @deprecated Use `const { removeNodes } = useNodes()` instead
 */
export function removeNodes(set: ReturnType<typeof useStore>['setState'], names: string[], scope?: string) {
  set((state) => {
    if (scope) {
      const currentScope = { ...(state.nodes[scope] as NodeRecord) }
      for (const name of names) delete currentScope[name]
      return { nodes: { ...state.nodes, [scope]: currentScope } }
    }
    const nodes = { ...state.nodes }
    for (const name of names) if (isTSLNode(nodes[name])) delete nodes[name]
    return { nodes }
  })
}

/**
 * Clear all nodes from a scope (removes the entire scope object)
 * @deprecated Use `const { clearNodes } = useNodes()` instead
 */
export function clearNodeScope(set: ReturnType<typeof useStore>['setState'], scope: string) {
  set((state) => {
    const { [scope]: _, ...rest } = state.nodes
    return { nodes: rest }
  })
}

/**
 * Clear all root-level nodes (preserves scopes)
 * @deprecated Use `const { clearNodes } = useNodes()` with `clearNodes('root')` instead
 */
export function clearRootNodes(set: ReturnType<typeof useStore>['setState']) {
  set((state) => {
    const nodes: typeof state.nodes = {}
    for (const [key, value] of Object.entries(state.nodes)) {
      if (!isTSLNode(value)) nodes[key] = value
    }
    return { nodes }
  })
}

export default useNodes

//* useLocalNodes ==============================

/** Creator receives RootState - destructure what you need. Returns any record. */
export type LocalNodeCreator<T extends Record<string, unknown>> = (state: RootState) => T

/**
 * Creates local values that rebuild when uniforms, nodes, or textures change.
 *
 * Unlike `useNodes`, this does NOT register to the global store.
 * Use for component-specific nodes/values that depend on shared resources.
 *
 * @example
 * ```tsx
 * // Destructure what you need from state
 * const { wobble, uTime } = useLocalNodes(({ uniforms, nodes }) => ({
 *   wobble: sin(uniforms.uTime.mul(2)),
 *   uTime: uniforms.uTime,  // can return uniforms too
 * }))
 *
 * // Or access anything else from RootState
 * const { scaled } = useLocalNodes(({ camera, nodes }) => ({
 *   scaled: nodes.basePos.mul(camera.zoom),
 * }))
 * ```
 */
export function useLocalNodes<T extends Record<string, unknown>>(creator: LocalNodeCreator<T>): T {
  const store = useStore()

  // Subscribe to trigger recreation when these change
  const uniforms = useThree((s) => s.uniforms)
  const nodes = useThree((s) => s.nodes)
  const textures = useThree((s) => s.textures)

  return useMemo(() => {
    const state = store.getState()
    return creator(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, creator, uniforms, nodes, textures]) // extras intentionally included to trigger recreation
}
