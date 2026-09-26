import type { RootState } from '@react-three/fiber/extension'
import { isBufferLike, isStorageLike, isTSLNode, isUniformNode } from './resourceGuards'

/**
 * @fileoverview Which shared resources a creator read, and whether any of them has changed since.
 *
 * `useLocalNodes` records every read a creator makes through its `CreatorState` wrappers: the
 * resource family, the path (scope names, then the key), the operation and what it saw. After the
 * result commits, the component re-evaluates only when one of those reads would now see something
 * else. An unrelated registration elsewhere changes nothing a read saw, so it neither re-renders
 * nor rebuilds the component.
 *
 * Reads are compared by identity, never deeply: a replaced uniform is a new object, while writing
 * `.value` on the existing one is not a change at all (the graph already references it).
 */

//* Types ==============================

/** The resource families a creator can read. `textures` is fiber's URL-keyed Map. */
export type TrackedKind = 'uniforms' | 'nodes' | 'buffers' | 'gpuStorage' | 'textures'

/** A scope object seen where a read expected an entry: its contents are tracked by the reads inside it. */
export const SCOPE = Symbol('readTracking.scope')

export type ResourceRead =
  /** The entry at `path` (a leaf, `SCOPE`, or `undefined` when absent). */
  | { kind: TrackedKind; op: 'get'; path: readonly string[]; seen: unknown }
  /** Whether the last key of `path` exists in its container. */
  | { kind: TrackedKind; op: 'has'; path: readonly string[]; seen: boolean }
  /** The key list of the container at `path` (enumeration, spread, `.size`). */
  | { kind: TrackedKind; op: 'keys'; path: readonly string[]; seen: readonly string[] }

/** Receives each read a wrapper serves. */
export type ReadObserver = (read: ResourceRead) => void

export interface ReadTracker {
  readonly reads: ResourceRead[]
  /** Set once the creator returns; a read after that (inside a deferred `Fn`) is not tracked. */
  closed: boolean
  /** Set the first time a check finds a changed read, so repeated checks stay consistent. */
  stale: boolean
  /** The observer to hand to the wrappers. */
  readonly observe: ReadObserver
}

//* Resolution ==============================

const LEAF_GUARDS = {
  uniforms: isUniformNode,
  nodes: isTSLNode,
  buffers: isBufferLike,
  gpuStorage: isStorageLike,
} as const

type ScopedKind = keyof typeof LEAF_GUARDS

function isScope(kind: ScopedKind, value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !LEAF_GUARDS[kind](value)
}

/** What the wrappers return for a stored value: scopes collapse to `SCOPE`. */
export function classify(kind: TrackedKind, value: unknown): unknown {
  return kind !== 'textures' && isScope(kind, value) ? SCOPE : value
}

/** The container a scope path names, or `undefined` when any step is absent or not a scope. */
function resolveContainer(kind: ScopedKind, state: RootState, scopePath: readonly string[]) {
  let container: Record<string, unknown> | undefined = state[kind] as Record<string, unknown>
  for (const key of scopePath) {
    const next: unknown = container?.[key]
    container = isScope(kind, next) ? next : undefined
  }
  return container
}

/** What `read` would see against `state` now. */
function observeNow(read: ResourceRead, state: RootState): unknown {
  if (read.kind === 'textures') {
    const map = state.textures
    if (read.op === 'keys') return [...map.keys()]
    return read.op === 'has' ? map.has(read.path[0]) : map.get(read.path[0])
  }
  if (read.op === 'keys') return Object.keys(resolveContainer(read.kind, state, read.path) ?? {})
  const container = resolveContainer(read.kind, state, read.path.slice(0, -1))
  const key = read.path[read.path.length - 1]
  if (read.op === 'has') return !!container && key in container
  return classify(read.kind, container?.[key])
}

function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((key, i) => key === b[i])
}

function hasChanged(read: ResourceRead, state: RootState): boolean {
  const now = observeNow(read, state)
  return read.op === 'keys' ? !sameKeys(read.seen, now as string[]) : !Object.is(read.seen, now)
}

//* Tracker ==============================

/** Warned once per message, so a creator re-running every frame does not flood the console. */
const warned = new Set<string>()

export function warnOnce(message: string): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return
  if (warned.has(message)) return
  warned.add(message)
  console.warn(message)
}

/** `uniforms.scope('fog').density` style label for diagnostics. */
export function describeRead(kind: TrackedKind, path: readonly string[]): string {
  if (kind === 'textures') return `textures.get('${path[0]}')`
  const scopes = path.slice(0, -1).map((key) => `.scope('${key}')`)
  return `${kind}${scopes.join('')}.${path[path.length - 1] ?? ''}`
}

/**
 * A fresh tracker for one creator evaluation. `hookName` labels the diagnostic for a read that
 * arrives after the evaluation closed, which is the signature of a lookup inside a deferred `Fn`.
 */
export function createReadTracker(hookName: string): ReadTracker {
  const tracker: ReadTracker = {
    reads: [],
    closed: false,
    stale: false,
    observe: (read) => {
      if (tracker.closed) {
        warnOnce(
          `[${hookName}] ${describeRead(read.kind, read.path)} was read after the creator returned, probably inside Fn(). ` +
            'That read is not tracked, so replacing the resource will not rebuild this graph. ' +
            'Read the resource in the creator and close over it in Fn.',
        )
        return
      }
      tracker.reads.push(read)
    },
  }
  return tracker
}

/**
 * Whether any read the tracker recorded would see something else against `state`. Sticky: once a
 * tracker is found stale it stays stale, so every caller within one update agrees.
 */
export function isTrackerStale(tracker: ReadTracker, state: RootState): boolean {
  if (!tracker.stale) tracker.stale = tracker.reads.some((read) => hasChanged(read, state))
  return tracker.stale
}

/**
 * Read reporting for the create-once creators (`useNodes`, `useUniforms`, `useBuffers`,
 * `useGPUStorage`). They run once per generation, so a creator that reads an entry before it exists
 * keeps `undefined` until the next rebuild. Nothing is tracked; a development warning names the read.
 */
export function warnMissingReads(hookName: string): { observe: ReadObserver; nested: false } {
  return {
    nested: false,
    observe: (read) => {
      if (read.op !== 'get' || read.seen !== undefined) return
      warnOnce(
        `[${hookName}] The creator read ${describeRead(read.kind, read.path)}, which does not exist yet. ` +
          `${hookName} creators run once per generation, so this one will not re-run when it appears. ` +
          'Register it earlier (above this hook, or higher in the tree), or call rebuild* once it exists. ' +
          'To probe on purpose, use .has().',
      )
    },
  }
}
