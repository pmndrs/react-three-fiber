import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import { useStore } from '@react-three/fiber/extension'
import { usePrimaryStore, usePrimaryThree } from './internal/usePrimaryStore'
import { clearResourceEntries, rebuildResource, removeResourceEntries } from './internal/resourceRegistry'
import { createLazyCreatorState, createResourceView, type CreatorState } from './internal/ScopedStore'
import {
  createReadTracker,
  isTrackerStale,
  warnMissingReads,
  warnOnce,
  type ReadTracker,
} from './internal/readTracking'
import { useIsomorphicLayoutEffect } from './internal/react'
import { isTSLNode } from './internal/resourceGuards'
import { useScopedResource } from './internal/useScopedResource'
import { scopedNodeName } from './internal/utils'
import type { NodeLike, NodeRecord, NodeStore } from '../types'

//* Types ==============================

/**
 * Every node representation a creator may return. The definition lives with the store types as
 * `NodeLike`, so the shape creators return and the shape `state.nodes` holds are one type by
 * construction: three's real `Node`, the callable proxy `Fn()` returns, or the legacy structural
 * `{ uuid, nodeType }` shape.
 */
export type TSLNodeLike = NodeLike

// `NodeRecord` and `NodeStore` are the store's own types, re-exported for hook consumers.
export type { NodeRecord, NodeStore }

/** Backward-compatible alias covering every accepted node representation. */
export type TSLNode = TSLNodeLike

/**
 * Creator function that returns a record of nodes.
 * Exact creator return inference is preserved within the compatible node constraint.
 */
export type NodeCreator<T extends Record<string, TSLNodeLike>> = (state: CreatorState) => T

/** Function signature for removeNodes util */
export type RemoveNodesFn = (names: string | string[], scope?: string) => void

/** Function signature for clearNodes util */
export type ClearNodesFn = (scope?: string) => void

/** Function signature for rebuildNodes util */
export type RebuildNodesFn = (scope?: string) => void

/** Return type with utils included */
export type NodesWithUtils<T extends Record<string, unknown> = NodeRecord> = T & {
  removeNodes: RemoveNodesFn
  clearNodes: ClearNodesFn
  rebuildNodes: RebuildNodesFn
}

//* Hook Overloads ==============================

// Get all nodes (returns full structure with root nodes and scopes + utils)
export function useNodes(): NodesWithUtils<NodeStore>

// Get nodes from a specific scope (+ utils)
export function useNodes(scope: string): NodesWithUtils<NodeRecord>

// Read existing nodes against an explicit schema, at root (no scope) or within a scope.
// A reader cannot infer types from a runtime string; supply the shape the creator returned.
export function useNodes<T extends NodeRecord>(scope?: string): NodesWithUtils<T>

// Create/get nodes at root level (no scope) (+ utils)
export function useNodes<T extends NodeRecord>(creator: NodeCreator<T>): NodesWithUtils<T>

// Create/get nodes within a scope (+ utils)
export function useNodes<T extends NodeRecord>(creator: NodeCreator<T>, scope: string): NodesWithUtils<T>

// Broad implementation overload keeps utility-only consumers assignable while the
// preceding call-site overloads preserve exact creator and reader inference.
export function useNodes(
  creatorOrScope?: NodeCreator<NodeRecord> | string,
  scope?: string,
): NodesWithUtils<Record<string, unknown>>

//* Hook Implementation ==============================

/**
 * Hook for managing global TSL nodes with create-if-not-exists pattern.
 *
 * Nodes at root level are stored directly on state.nodes.
 * Scoped nodes are stored under state.nodes[scope].
 * Accepts Three nodes, callable Fn nodes, and legacy uuid/nodeType structural nodes.
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
): NodesWithUtils<T> | NodesWithUtils<NodeRecord> | NodesWithUtils<NodeStore> {
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
      return (creatorOrScope as NodeCreator<T>)(
        createLazyCreatorState(store.getState(), store, { reads: warnMissingReads('useNodes') }),
      )
    },
    prepare: (name, node) => {
      // Apply label for debugging
      const setName = Reflect.get(node, 'setName')
      if (typeof setName === 'function') setName.call(node, scopedNodeName(scope, name))
      return node
    },
  })

  // Case 1: No arguments - all nodes (root + scopes), reactive via storeNodes
  // Case 2: String argument - that scope's nodes (guard against a TSL node
  //         stored under the same name), reactive via storeNodes
  // Case 3: Creator function - the entries registered above
  let nodes: NodeRecord | NodeStore = created
  if (creatorOrScope === undefined) {
    nodes = storeNodes as NodeStore
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

export default useNodes

//* useLocalNodes ==============================

/** Creator receives CreatorState with ScopedStore wrappers for type-safe access. Returns any record. */
export type LocalNodeCreator<T extends Record<string, unknown>> = (state: CreatorState) => T

/**
 * The install step an install-form creator returns: it runs after commit (as a layout effect) and
 * may return a cleanup, which runs before the next install and on unmount.
 */
export type LocalNodeInstall = () => void | (() => void)

/** A creator that builds during render and returns an install step instead of a record. */
export type LocalNodeInstaller = (state: CreatorState) => LocalNodeInstall

/** `Object.is` over two dependency lists of equal length. Never deep: closures cannot be inferred. */
function areDepsEqual(next: React.DependencyList, prev: React.DependencyList): boolean {
  if (next.length !== prev.length) return false
  for (let i = 0; i < next.length; i++) if (!Object.is(next[i], prev[i])) return false
  return true
}

interface DependencyRecord {
  deps: React.DependencyList | undefined
  /** Fresh object whenever the declared dependencies change — the memo's one caller-driven input. */
  token: object
}

/**
 * Collapse a caller's dependency list into ONE memo input so hook order and dependency-list
 * length stay fixed no matter how the caller invokes the hook. React must never see the
 * caller's array directly: its length may legitimately differ between call sites, and forwarding
 * a changing-length list is exactly what React warns about.
 *
 * - No array: a new token every render, so the memo re-evaluates every render.
 * - Array: the previous token is reused while every entry is `Object.is`-equal to the previous
 *   render's, and replaced otherwise. Comparison is against the last RENDERED list, which is
 *   what `useMemo` itself does; an abandoned render can at worst cost one extra evaluation,
 *   never a stale result, because the memo below still keys on the committed token.
 *
 * Development diagnostics cover the two contract violations a runtime can detect: the list
 * appearing/disappearing between renders, and its length changing.
 */
function useDependencyToken(deps: React.DependencyList | undefined): object {
  const previous = useRef<DependencyRecord | null>(null)
  const record = previous.current

  // Guarded like fiber's notices: this package is not bundled with anything that defines `process`.
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && record) {
    const hadDeps = record.deps !== undefined
    const hasDeps = deps !== undefined
    if (hadDeps !== hasDeps) {
      console.warn(
        `[useLocalNodes] The dependency array was ${hasDeps ? 'added' : 'omitted'} between renders. ` +
          'Pass an array on every render or on none; the mode must not change for a mounted component.',
      )
    } else if (hasDeps && record.deps!.length !== deps.length) {
      console.warn(
        `[useLocalNodes] The dependency array length changed between renders (${record.deps!.length} → ${deps.length}). ` +
          'Declare a fixed-length list; conditional dependencies belong inside the array as values.',
      )
    }
  }

  if (deps === undefined) {
    previous.current = { deps: undefined, token: {} }
  } else if (!record || record.deps === undefined || !areDepsEqual(deps, record.deps)) {
    previous.current = { deps, token: {} }
  } else if (record.deps !== deps) {
    // Same values, new array literal: keep the token, remember the latest list.
    previous.current = { deps, token: record.token }
  }

  return previous.current!.token
}

/**
 * Creates component-local values from the rendering context and the shared TSL resources.
 *
 * Unlike `useNodes`, this does NOT register to the global store — nothing is published during
 * render or commit. The creator runs in the render phase and is pure computation.
 *
 * **When the creator re-runs** is controlled by the optional `deps` array, mirroring `useMemo`:
 *
 * | Call                             | Ordinary component renders                                  |
 * | -------------------------------- | ----------------------------------------------------------- |
 * | `useLocalNodes(creator)`         | Re-evaluate every render, even with a `useCallback` creator |
 * | `useLocalNodes(creator, [])`     | Reuse the result                                            |
 * | `useLocalNodes(creator, [a, b])` | Reuse until a declared dependency changes by `Object.is`    |
 *
 * Independently of `deps`, three things re-run the creator: a change to a shared resource the
 * creator READ (replaced, removed, or appearing where it read nothing), a change of the owning
 * (primary) store, and an HMR / `rebuild*` invalidation. Registrations the creator did not read
 * change nothing, and writing `.value` on a uniform it read is not a change. `[]` therefore means
 * "no JavaScript construction inputs", not "never rebuild". Whenever it re-runs, the creator from
 * the CURRENT render is used; creator identity itself is never a rebuild trigger once an array is
 * supplied.
 *
 * Only reads the creator makes before it returns are tracked. Inside `Fn(() => …)` the body runs
 * later, while three builds the shader, so read the resource in the creator and close over it.
 *
 * `[]` is the normal case. A value that changes (a color prop, a slider) belongs in a uniform: the
 * graph references the `UniformNode`, so updating its `.value` needs no rebuild and must not be a
 * dependency. Declare only inputs that decide the graph's structure and cannot be uniforms: which
 * node to use, a loop count, whether a branch exists.
 *
 * **Install form.** To put a node onto a Three object (`scene.fogNode`, `scene.backgroundNode`),
 * return a function instead of a record. The creator still builds during render; the returned
 * function runs after commit and may return a cleanup, which runs before the next install and on
 * unmount. Mutating a Three object inside the creator itself is unsafe: React can discard a
 * render, and StrictMode renders twice. The hook returns nothing in this form.
 *
 * ```tsx
 * useLocalNodes(({ scene, uniforms }) => {
 *   const fogNode = fog(uniforms.fogColor, rangeFogFactor(uniforms.near, uniforms.far))
 *   return () => {
 *     scene.fogNode = fogNode
 *     return () => { scene.fogNode = null }
 *   }
 * }, [])
 * ```
 *
 * @example
 * ```tsx
 * // Resource-driven composition: no surrounding JS inputs.
 * const { wobble, uTime } = useLocalNodes(({ uniforms, nodes }) => ({
 *   wobble: sin(uniforms.uTime.mul(2)),
 *   uTime: uniforms.uTime, // can return uniforms too
 * }), [])
 *
 * // `pattern` picks which node the graph is built from: a structural input.
 * const { result } = useLocalNodes(({ nodes }) => ({
 *   result: pattern === 'noise' ? nodes.noise : nodes.stripes,
 * }), [pattern])
 *
 * // Type-safe uniform access
 * const { colorNode } = useLocalNodes(({ uniforms }) => {
 *   const uValue = uniforms.myUniform as UniformNode<number>
 *   return { colorNode: mix(colorA, colorB, uValue) }
 * }, [])
 * ```
 */
export function useLocalNodes(creator: LocalNodeInstaller, deps?: React.DependencyList): void
export function useLocalNodes<T extends Record<string, unknown>>(
  creator: LocalNodeCreator<T>,
  deps?: React.DependencyList,
): T
export function useLocalNodes<T extends Record<string, unknown>>(
  creator: LocalNodeCreator<T> | LocalNodeInstaller,
  deps?: React.DependencyList,
): T | void {
  // The TSL maps live on the primary store; `scene`, `camera`, `textures` and the rest of the
  // creator's state come from this component's own canvas (a secondary has its own scene).
  const local = useStore()
  const store = usePrimaryStore()
  const view = useMemo(() => createResourceView(store, local), [store, local])

  // Deliberate invalidation (HMR / rebuild*) re-runs every creator, whatever it read.
  const hmrVersion = usePrimaryThree((s) => s._hmrVersion)

  // The caller's declared JavaScript construction inputs, collapsed to one stable input.
  const depsToken = useDependencyToken(deps)

  // The reads of the COMMITTED evaluation. Assigned at commit, so an evaluation React throws away
  // never replaces the reads the component is subscribed through.
  const committedReads = useRef<ReadTracker | null>(null)
  const readsVersion = useRef(0)

  // Changes whenever a committed read would now see something else. Unrelated store updates leave
  // it as it is, so they neither re-render this component nor re-run the creator. The check is
  // sticky per tracker, so repeated calls within one update agree.
  const getReadsVersion = () => {
    const tracker = committedReads.current
    if (tracker && !tracker.stale && isTrackerStale(tracker, view)) readsVersion.current++
    return readsVersion.current
  }
  const subscribe = useCallback(
    (onChange: () => void) => {
      const unsubscribe = store.subscribe(onChange)
      if (local === store) return unsubscribe
      const unsubscribeLocal = local.subscribe(onChange)
      return () => {
        unsubscribe()
        unsubscribeLocal()
      }
    },
    [store, local],
  )
  const resourceVersion = useSyncExternalStore(subscribe, getReadsVersion, getReadsVersion)

  const evaluation = useMemo(() => {
    // Lazy ScopedStore wrapping - Proxies only created if uniforms/nodes accessed.
    // The store is passed so entries staged (not yet committed) by creator hooks
    // earlier in this render pass are visible here too.
    const tracker = createReadTracker('useLocalNodes')
    const reads = { observe: tracker.observe, nested: true }
    const value = creator(createLazyCreatorState(local.getState(), store, { reads, view }))
    tracker.closed = true
    return { value, tracker }
    // `creator` is intentionally not a dependency: the memo closes over the current render's
    // creator and only its declared inputs (depsToken) decide whether it runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, hmrVersion, depsToken, resourceVersion])

  const { value, tracker } = evaluation
  const installing = typeof value === 'function'
  useModeDiagnostics(value, installing)

  useIsomorphicLayoutEffect(() => {
    committedReads.current = tracker
    if (!installing) return

    // Reads the install step makes are tracked like the creator's: reopen the evaluation for it.
    tracker.closed = false
    let cleanup: void | (() => void)
    try {
      cleanup = (value as LocalNodeInstall)()
    } finally {
      tracker.closed = true
    }
    return typeof cleanup === 'function' ? cleanup : undefined
  }, [evaluation])

  return installing ? undefined : (value as T)
}

/**
 * Development diagnostics for the creator's return: nothing at all (a mutation made during render),
 * and a switch between the record and install forms on a mounted component.
 */
function useModeDiagnostics(value: unknown, installing: boolean): void {
  const previous = useRef<boolean | null>(null)
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return

  if (value === undefined || value === null) {
    warnOnce(
      '[useLocalNodes] The creator returned nothing. To put a node onto a Three object (scene.fogNode = ...), ' +
        'build it in the creator and return a function that assigns it: that function runs after commit and may ' +
        'return a cleanup. Assigning inside the creator runs during render, which React may discard or repeat.',
    )
  }
  if (previous.current !== null && previous.current !== installing) {
    warnOnce(
      '[useLocalNodes] The creator switched between returning a record and returning an install function. ' +
        'Keep one form for a mounted component.',
    )
  }
  previous.current = installing
}
