import { useCallback, useMemo } from 'react'
import { useStore } from '../../core/hooks'
import { usePrimaryStore, usePrimaryThree } from '../../core/hooks/usePrimaryStore'
import { clearResourceEntries, rebuildResource, removeResourceEntries } from '../../core/utils/resourceRegistry'
import { createLazyCreatorState, type CreatorState } from './ScopedStore'
import { useScopedResource } from './useScopedResource'
import { scopedNodeName } from './utils'

//* Types ==============================

/**
 * Minimal interface for TSL nodes.
 * Used instead of Three.js's Node type because the @types/three definitions
 * have inconsistencies where OperatorNode, ConstNode, etc. don't properly
 * extend Node with all required properties.
 */
export interface TSLNodeLike {
  uuid?: string
  nodeType?: string | null
  /** label method for chaining - sets the node's label and returns self */
  label?: ((label: string) => TSLNodeLike) | string
  setName?: (name: string) => this
}

/** TSL node type - alias for compatibility */
export type TSLNode = TSLNodeLike

/**
 * A record of TSL nodes - allows mixed node types (OperatorNode, ConstNode, etc.)
 * Uses TSLNodeLike for broader compatibility with Three.js's TSL type definitions.
 */
export type NodeRecord<T extends TSLNodeLike = TSLNodeLike> = Record<string, T>

/**
 * Creator function that returns a record of nodes.
 * Uses TSLNodeLike constraint to allow mixed node types
 * (e.g., { n: OperatorNode; color: ConstNode<Color> }) to pass type checking.
 */
export type NodeCreator<T extends Record<string, TSLNodeLike>> = (state: CreatorState) => T

/** Function signature for removeNodes util */
export type RemoveNodesFn = (names: string | string[], scope?: string) => void

/** Function signature for clearNodes util */
export type ClearNodesFn = (scope?: string) => void

/** Function signature for rebuildNodes util */
export type RebuildNodesFn = (scope?: string) => void

/** Return type with utils included */
export type NodesWithUtils<T extends Record<string, TSLNodeLike> = Record<string, TSLNodeLike>> = T & {
  removeNodes: RemoveNodesFn
  clearNodes: ClearNodesFn
  rebuildNodes: RebuildNodesFn
}

/** Type guard to check if a value is a TSLNode vs a scope object */
const isTSLNode = (value: unknown): value is TSLNodeLike =>
  value !== null && typeof value === 'object' && ('uuid' in value || 'nodeType' in value)

//* Hook Overloads ==============================

// Get all nodes (returns full structure with root nodes and scopes + utils)
export function useNodes(): NodesWithUtils<Record<string, TSLNodeLike> & Record<string, Record<string, TSLNodeLike>>>

// Get nodes from a specific scope (+ utils)
export function useNodes(scope: string): NodesWithUtils<Record<string, TSLNodeLike>>

// Create/get nodes at root level (no scope) (+ utils)
export function useNodes<T extends Record<string, TSLNodeLike>>(creator: NodeCreator<T>): NodesWithUtils<T>

// Create/get nodes within a scope (+ utils)
export function useNodes<T extends Record<string, TSLNodeLike>>(
  creator: NodeCreator<T>,
  scope: string,
): NodesWithUtils<T>

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
export function useNodes<T extends Record<string, TSLNodeLike>>(
  creatorOrScope?: NodeCreator<T> | string,
  scope?: string,
):
  | NodesWithUtils<T>
  | NodesWithUtils<Record<string, TSLNodeLike>>
  | NodesWithUtils<Record<string, TSLNodeLike> & Record<string, Record<string, TSLNodeLike>>> {
  const store = usePrimaryStore()

  //* Utils ==============================
  // Memoized util functions that capture store reference

  /** Remove nodes by name from root or a scope */
  const removeNodes = useCallback<RemoveNodesFn>(
    (names, targetScope) =>
      removeResourceEntries(store, 'nodes', Array.isArray(names) ? names : [names], targetScope, isTSLNode),
    [store],
  )

  /** Clear nodes - scope name, 'root' for root only, or undefined for all */
  const clearNodes = useCallback<ClearNodesFn>(
    (targetScope) => clearResourceEntries(store, 'nodes', targetScope, isTSLNode),
    [store],
  )

  /** Rebuild nodes - invalidates the cache and increments HMR version to trigger re-creation */
  const rebuildNodes = useCallback<RebuildNodesFn>(
    (targetScope) => rebuildResource(store, 'nodes', targetScope),
    [store],
  )

  //* Main Logic ==============================

  // Determine if we're in reader mode (no creator function)
  const isReader = creatorOrScope === undefined || typeof creatorOrScope === 'string'

  // Subscribe to nodes changes for reader modes
  // This ensures useNodes() and useNodes('scope') reactively update when store changes
  // For creator mode, we intentionally don't use this value to avoid re-running the creator
  const storeNodes = usePrimaryThree((s) => s.nodes)

  // Creator mode: run the creator and register the result through the shared
  // staged-registration mechanism (render-phase creation, commit-phase store
  // write). In reader mode this stages nothing and returns {}.
  const created = useScopedResource<TSLNodeLike>({
    store,
    kind: 'nodes',
    scope: isReader ? undefined : scope,
    isLeaf: isTSLNode,
    create: () => {
      if (isReader) return {}
      // Lazy ScopedStore wrapping - Proxies only created if uniforms/nodes accessed
      return (creatorOrScope as NodeCreator<T>)(createLazyCreatorState(store.getState(), store))
    },
    prepare: (name, node) => {
      // Apply label for debugging
      node.setName?.(scopedNodeName(scope, name))
      return node
    },
  })

  // Case 1: No arguments - all nodes (root + scopes), reactive via storeNodes
  // Case 2: String argument - that scope's nodes (guard against a TSL node
  //         stored under the same name), reactive via storeNodes
  // Case 3: Creator function - the entries registered above
  let nodes: NodeRecord | (NodeRecord & Record<string, NodeRecord>) = created
  if (creatorOrScope === undefined) {
    nodes = storeNodes as NodeRecord & Record<string, NodeRecord>
  } else if (typeof creatorOrScope === 'string') {
    const scopeData = storeNodes[creatorOrScope]
    nodes = scopeData && !isTSLNode(scopeData) ? (scopeData as NodeRecord) : {}
  }

  // Return nodes with utils
  return { ...nodes, removeNodes, clearNodes, rebuildNodes } as NodesWithUtils<T>
}

//* Standalone rebuildNodes ==============================
// Global function for HMR integration - can be called from Canvas or module-level code

/**
 * Global rebuildNodes function for HMR integration.
 * Invalidates cached nodes and increments _hmrVersion to trigger re-creation.
 * Call this when HMR is detected to refresh all node creators.
 *
 * Resolves to the primary store so shared TSL resources rebuild on the
 * authoritative store.
 *
 * @param store - The R3F store (from useStore or context)
 * @param scope - Optional scope to rebuild ('root' for root only, string for specific scope, undefined for all)
 */
export function rebuildAllNodes(store: ReturnType<typeof useStore>, scope?: string) {
  rebuildResource(store, 'nodes', scope)
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

/** Creator receives CreatorState with ScopedStore wrappers for type-safe access. Returns any record. */
export type LocalNodeCreator<T extends Record<string, unknown>> = (state: CreatorState) => T

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
 *
 * // Type-safe uniform access
 * const { colorNode } = useLocalNodes(({ uniforms }) => {
 *   const uValue = uniforms.myUniform as UniformNode<number>
 *   return { colorNode: mix(colorA, colorB, uValue) }
 * })
 * ```
 */
export function useLocalNodes<T extends Record<string, unknown>>(creator: LocalNodeCreator<T>): T {
  const store = usePrimaryStore()

  // Subscribe to trigger recreation when these change
  const uniforms = usePrimaryThree((s) => s.uniforms)
  const nodes = usePrimaryThree((s) => s.nodes)
  const textures = usePrimaryThree((s) => s.textures)
  // Subscribe to HMR version to rebuild on hot reload
  const hmrVersion = usePrimaryThree((s) => s._hmrVersion)

  return useMemo(() => {
    // Lazy ScopedStore wrapping - Proxies only created if uniforms/nodes accessed.
    // The store is passed so entries staged (not yet committed) by creator hooks
    // earlier in this render pass are visible here too.
    const wrappedState = createLazyCreatorState(store.getState(), store)
    return creator(wrappedState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, creator, uniforms, nodes, textures, hmrVersion]) // hmrVersion triggers rebuild on HMR
}
