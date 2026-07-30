import { createStore } from '../src/core/store'
import { clearHmrCaches } from '../src/core/utils/hmr'
import {
  RESOURCE_KINDS,
  ROOT_SCOPE,
  flushStagedScope,
  isScopeValid,
  stageEntries,
} from '../src/core/utils/resourceRegistry'

const noop = () => {}
const isLeaf = () => true

describe('clearHmrCaches', () => {
  // Regression for Bug #4: the HMR handler invalidated only nodes/uniforms,
  // leaving buffers/gpuStorage reusable after a hot reload. All four kinds
  // must go stale. Since the C16 fix that means INVALIDATION, not wiping:
  // wiping notified readers with empty scopes mid-rebuild and stripped the
  // material *Node props (see tests/webgpu/hmr-rebuild.test.tsx).
  it('invalidates all four TSL resource kinds, keeps entries visible to readers, and bumps _hmrVersion', () => {
    const store = createStore(noop, noop)

    // Register one committed entry per kind through the real staged flush path
    for (const kind of RESOURCE_KINDS) {
      stageEntries(store, kind, ROOT_SCOPE, { entry: kind })
      flushStagedScope(store, kind, ROOT_SCOPE, isLeaf)
      expect(isScopeValid(store, kind, ROOT_SCOPE)).toBe(true)
    }
    const before = store.getState()._hmrVersion

    clearHmrCaches(store)

    const state = store.getState()
    for (const kind of RESOURCE_KINDS) {
      // Stale for creators: nothing committed may be reused into the new generation…
      expect(isScopeValid(store, kind, ROOT_SCOPE)).toBe(false)
      // …but still visible to readers until the rebuilt generation lands atomically
      expect((state[kind] as Record<string, unknown>).entry).toBe(kind)
    }
    expect(state._hmrVersion).toBe(before + 1)
  })

  it('resolves primaryStore so a secondary canvas invalidates the shared store', () => {
    const primary = createStore(noop, noop)
    const secondary = createStore(noop, noop)
    secondary.setState({ primaryStore: primary })

    stageEntries(primary, 'nodes', ROOT_SCOPE, { n: 1 })
    flushStagedScope(primary, 'nodes', ROOT_SCOPE, isLeaf)
    const before = primary.getState()._hmrVersion

    clearHmrCaches(secondary)

    expect(isScopeValid(primary, 'nodes', ROOT_SCOPE)).toBe(false)
    expect(primary.getState()._hmrVersion).toBe(before + 1)
  })
})
