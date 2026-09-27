import type { RootStore } from '@react-three/fiber/extension'
import { ROOT_SCOPE, flushStagedScope, readCommittedScope, stageEntries } from './resourceRegistry'
import { isUniformNode } from './resourceGuards'
import { createUniform } from './createUniform'

/** Uniforms that exist on every primary canvas from the start. See configureTSL. */
export interface TSLConfig {
  /** Root-level uniform inputs, e.g. the object you registered as `Register['uniforms']` */
  uniforms?: UniformInputRecord
  /** Scoped uniform inputs, e.g. the object you registered as `Register['scopes']` */
  scopes?: Record<string, UniformInputRecord>
}

/** Primary canvases currently mounted -- where shared resources live. Kept by the root extension. */
const primaries = new Set<RootStore>()
let config: TSLConfig | null = null

/** @internal A primary canvas was set up: apply the configuration to it. */
export function trackPrimary(store: RootStore): void {
  primaries.add(store)
  if (config) applyConfig(store, config)
}

/** @internal A primary canvas unmounted. */
export function untrackPrimary(store: RootStore): void {
  primaries.delete(store)
}

/** Create the configured uniforms that do not exist yet. Existing nodes are left untouched. */
function applyConfig(store: RootStore, config: TSLConfig): void {
  const add = (scope: string | undefined, inputs: UniformInputRecord | undefined) => {
    if (!inputs) return
    const scopeKey = scope ?? ROOT_SCOPE
    const existing = readCommittedScope(store.getState().uniforms, scopeKey, isUniformNode)
    const fresh: Record<string, UniformNode> = {}
    for (const [name, value] of Object.entries(inputs)) {
      if (!(name in existing)) fresh[name] = createUniform(name, value, scope)
    }
    if (!Object.keys(fresh).length) return
    // Through the same staging path the hooks use, so the scope is valid for reuse: a hook that
    // later declares the same name gets this node instead of replacing it.
    stageEntries(store, 'uniforms', scopeKey, fresh)
    flushStagedScope(store, 'uniforms', scopeKey, isUniformNode)
  }
  add(undefined, config.uniforms)
  for (const [scope, inputs] of Object.entries(config.scopes ?? {})) add(scope, inputs)
}

/**
 * Create uniforms on every primary canvas up front -- the runtime half of `Register`. Pass the same
 * objects you registered, so the registered types are true before the first frame:
 *
 * ```ts
 * configureTSL({ uniforms: globalUniforms, scopes: { player: playerUniforms } })
 * ```
 *
 * They land on the primary canvas's RootState, so `state.uniforms` has them on the primary, its
 * secondaries and every portal. Applies to canvases already mounted and to every canvas mounted
 * later. Calling it again adds to the configuration; uniforms that already exist are never
 * replaced. Optional: without it, a uniform exists once some component creates it.
 */
export function configureTSL(next: TSLConfig): void {
  config = {
    uniforms: { ...config?.uniforms, ...next.uniforms },
    scopes: { ...config?.scopes, ...next.scopes },
  }
  for (const store of primaries) applyConfig(store, config)
}
