/** Renderer resources: creation, shared canvas lookup, and ownership through final release. */
import type { WebGLRenderer } from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import type { RootStore, RendererProvider, RenderProps, WebGPUSupport, Dpr } from '#types'
import { getThree, registerThree } from './three'
import { calculateDpr, is } from './utils'
import { getScheduler } from '@pmndrs/scheduler'
import { resolveThen } from './utils/promise'
import { isDevelopment, notifyDepreciated } from './utils/notices'
import { computeInitialSize } from './utils/three'

export const isRenderer = (def: any) => !!def?.render

/**
 * Create the three objects a fresh store carries (`frustum`, `pointer`, `mouse`) once its renderer
 * support -- and with it three's shared core -- is loaded. Idempotent: a store reused by createRoot
 * after an unmount already has them.
 */
function ensureStoreThreeObjects(store: RootStore): void {
  const state = store.getState()
  if (state.pointer) return
  const { Vector2, Frustum } = getThree()
  const pointer = new Vector2()
  state.set({ pointer, mouse: pointer, frustum: new Frustum() })
}

/** R3F settings read from the gl/renderer props bag. Not renderer parameters or properties. */
const R3F_RENDERER_SETTINGS = ['textureColorSpace', 'shadows']

/**
 * Keys of the gl/renderer props bag that are never applied to the live renderer: R3F's own settings,
 * and constructor parameters. Those are read once when the renderer is built and are read-only or
 * meaningless on the instance, so re-applying them (`depth`, `forceWebGL`, `getFallback`, ...) would
 * only add stray fields to it.
 */
export const NON_APPLIED_RENDERER_PROPS = new Set([
  ...R3F_RENDERER_SETTINGS,
  'canvas',
  'antialias',
  'alpha',
  'samples',
  'powerPreference',
  'depth',
  'stencil',
  'logarithmicDepthBuffer',
  'reversedDepthBuffer',
  // WebGPURenderer only
  'forceWebGL',
  'outputBufferType',
  'multiview',
  'getFallback',
  'trackTimestamp',
])

/** The gl/renderer prop when it is a props bag, not `true`, a renderer instance or a factory. */
export function settingsBag(config: unknown): Record<string, any> | undefined {
  return is.obj(config) && !isRenderer(config) ? (config as Record<string, any>) : undefined
}

/** A renderer instance or factory: the caller builds the renderer, so R3F does not configure it. */
export function isInstanceOrFactory(config: unknown): boolean {
  return is.fun(config) || isRenderer(config)
}

/**
 * Throw for props v10 moved, naming the new API, rather than silently ignoring them. The Canvas
 * types no longer have them; JS callers and stale code still pass them.
 */
export function assertNoRemovedConfig(props: Record<string, any>): void {
  if (props.primaryCanvas !== undefined) {
    throw new Error(
      'R3F: `primaryCanvas` was removed: mark the owner <Canvas primary> and other canvases share it ' +
        'automatically (or use share="id")',
    )
  }
  if (props.shadows !== undefined) {
    throw new Error(
      'R3F: the `shadows` Canvas prop moved into the renderer settings: use `renderer={{ shadows }}` ' +
        '(or `gl={{ shadows }}` for WebGL and @react-three/fiber/legacy)',
    )
  }
  for (const name of ['renderer', 'gl'] as const) {
    const bag = settingsBag(props[name])
    if (!bag) continue
    if ('primaryCanvas' in bag) {
      throw new Error(
        `R3F: \`${name}={{ primaryCanvas }}\` was removed: mark the owner <Canvas primary> and other ` +
          'canvases share it automatically (or use share="id")',
      )
    }
    if ('scheduler' in bag) {
      throw new Error(`R3F: \`${name}={{ scheduler }}\` moved to <Canvas scheduler>`)
    }
  }
}

// Helper to resolve renderer config (handles: function | instance | props). R3F owns what it
// builds, a factory's result included, since R3F calls the factory once per root. An instance
// belongs to the caller.
function resolveRenderer<T>(
  config: any,
  defaultProps: Record<string, any>,
  RendererClass: new (props: any) => T,
): { renderer: T; owned: boolean } | Promise<{ renderer: T; owned: boolean }> {
  if (typeof config === 'function') {
    return resolveThen<T, { renderer: T; owned: boolean }>(config(defaultProps), (renderer) => ({
      renderer,
      owned: true,
    }))
  }
  if (isRenderer(config)) return { renderer: config as T, owned: false }
  const params: Record<string, any> = { ...defaultProps }
  for (const key in settingsBag(config)) if (!R3F_RENDERER_SETTINGS.includes(key)) params[key] = config[key]
  return { renderer: new RendererClass(params), owned: true }
}

/**
 * Resolve, size and init the WebGPURenderer a root renders with itself (not one it borrows).
 * Returns resolveRenderer's `{ renderer, owned }` unchanged, so the caller leases it with the
 * right ownership: R3F disposes what it built, never a renderer instance the caller passed in.
 *
 * Shared by the primary path and by the multi-canvas WebGL2 fallback (#3965): three
 * allocates the depth/stencil and MSAA colour buffers from the renderer's *own* canvas
 * target (`renderer._canvasTarget`, `_width * _pixelRatio`), which reads the canvas
 * element's width/height once at construction and never again. Writing
 * canvas.width/height directly therefore only moves the swap chain: the target stays
 * at 300x150 and so does the depth buffer, and the first frame raises a
 * GPUValidationError about mismatched attachment sizes. `setSize` goes through the
 * target, so both stay in step. Before init the resize listener is a no-op, so this
 * is safe to call here (#3847).
 */
function createOwnedWebGPURenderer<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  rendererConfig: RenderProps<TCanvas>['renderer'],
  defaultGPUProps: Record<string, unknown>,
  canvas: TCanvas,
  propsSize: RenderProps<TCanvas>['size'],
  dpr: Dpr,
  support: WebGPUSupport,
): { renderer: WebGPURenderer; owned: boolean } | Promise<{ renderer: WebGPURenderer; owned: boolean }> {
  return resolveThen(resolveRenderer(rendererConfig, defaultGPUProps, support.Renderer), (resolved) => {
    const renderer = resolved.renderer as WebGPURenderer

    // Skip init only for pre-initialized external renderers
    // @see https://github.com/pmndrs/react-three-fiber/issues/3651
    if (!renderer.hasInitialized?.()) {
      const size = computeInitialSize(canvas, propsSize)
      if (size.width > 0 && size.height > 0) {
        renderer.setPixelRatio(calculateDpr(dpr))
        renderer.setSize(size.width, size.height, false)
      }
      return resolveThen(renderer.init(), () => ({ renderer, owned: resolved.owned }))
    }

    return { renderer, owned: resolved.owned }
  })
}

/** Creates and leases one renderer. Synchronous supports/factories stay synchronous. */
export function initializeRenderer<TCanvas extends HTMLCanvasElement | OffscreenCanvas>(
  canvas: TCanvas,
  provider: RendererProvider,
  store: RootStore,
  props: RenderProps<TCanvas>,
): void | Promise<void> {
  const {
    id: canvasId,
    primary = false,
    share,
    gl: glConfig,
    renderer: rendererConfig,
    size: propsSize,
    dpr = [1, 2],
    _primaryToken,
  } = props
  assertNoRemovedConfig(props)
  const rendererBag = settingsBag(rendererConfig)
  const state = store.getState()
  const { webgl, webgpu } = provider
  //* Renderer Initialization ==============================

  const defaultGLProps = {
    canvas: canvas as HTMLCanvasElement,
    powerPreference: 'high-performance' as const,
    antialias: true,
    alpha: true,
  }

  const defaultGPUProps = {
    canvas: canvas as HTMLCanvasElement,
    antialias: true,
  }

  //* Entry Validation ==============================
  // Check if the requested renderer is one this entry can construct
  if (glConfig && !webgl) {
    throw new Error(
      'WebGLRenderer (gl prop) is not available on this entry. ' +
        'Use @react-three/fiber or @react-three/fiber/legacy instead.',
    )
  }
  if (rendererConfig && !webgpu) {
    throw new Error(
      'WebGPURenderer (renderer prop) is not available on this entry. ' +
        'Use @react-three/fiber or @react-three/fiber/webgpu instead.',
    )
  }
  if (glConfig && rendererConfig) {
    throw new Error('Cannot use both gl and renderer props at the same time')
  }

  //* Multi-Canvas Validation ==============================
  // A primary owns a WebGPU renderer that other canvases share through CanvasTarget, which WebGL
  // has no equivalent of
  if (primary && !webgpu) {
    throw new Error(
      'R3F: <Canvas primary> shares a WebGPU renderer and is not available on this entry. ' +
        'Use @react-three/fiber or @react-three/fiber/webgpu instead.',
    )
  }
  if (primary && glConfig) {
    throw new Error(
      'R3F: <Canvas primary> shares a WebGPU renderer and cannot be used with WebGL. ' +
        'Remove the `gl` prop or use the `renderer` prop.',
    )
  }
  if (primary && is.str(share)) {
    throw new Error(`R3F: a <Canvas primary> owns its renderer; remove share="${share}" from it.`)
  }
  if (is.str(share)) {
    if (!webgpu || glConfig) {
      throw new Error(
        `R3F: share="${share}" borrows a WebGPU renderer and cannot be used with WebGL. ` +
          'Remove the `gl` prop, or use @react-three/fiber or @react-three/fiber/webgpu.',
      )
    }
    if (isInstanceOrFactory(rendererConfig)) {
      throw new Error(
        `R3F: share="${share}" borrows the primary's renderer, so it cannot be combined with a renderer ` +
          'instance or factory. Remove one of the two.',
      )
    }
  }

  //* Primary Announcement ==============================
  // Before anything async: a canvas configuring in the same tick must see this primary coming and
  // wait for it rather than build its own renderer. A Canvas has already announced from its
  // insertion effect; configure continues that announcement under the same token.
  const primaryKey = canvasId || DEFAULT_PRIMARY
  const primaryToken = _primaryToken ?? store
  if (primary && !state.internal.actualRenderer) {
    announcePrimary(primaryKey, primaryToken)
    // Teardown withdraws it: sharing canvases already mounted keep their lease on the renderer
    state.internal.unregisterPrimary = () => withdrawPrimary(primaryKey, primaryToken)
    if (primaryConflict(primaryKey, primaryToken)) {
      throw new Error(
        primaryKey === DEFAULT_PRIMARY
          ? 'R3F: two <Canvas primary> are mounted without ids. Give each primary a distinct `id`, and ' +
              'point the other canvases at one with share="id".'
          : `R3F: two <Canvas primary> use the id "${primaryKey}". Give each primary a distinct \`id\`.`,
      )
    }
  }

  //* Renderer Sharing ==============================
  // Decided once, when this canvas creates its renderer. A canvas shares when it names a primary
  // (share="id"), or when exactly one primary is live and it did not opt out: share={false}, the gl
  // prop (WebGL), or a renderer instance/factory of its own all mean "my own renderer". A renderer
  // props bag does not: renderer-wide settings come from the primary, and the bag is ignored.
  let shareKey: string | undefined
  if (!state.internal.actualRenderer && webgpu && !primary && !glConfig && !state.isLegacy) {
    if (is.str(share)) {
      shareKey = share
    } else if (share !== false && !isInstanceOrFactory(rendererConfig)) {
      const live = livePrimaryKeys()
      if (live.length > 1) {
        throw new Error(
          `R3F: ${live.length} primaries are mounted (${live.map(describePrimary).join(', ')}), so this ` +
            'canvas cannot pick one to share. Pass share="id" to name one, or share={false} for its own renderer.',
        )
      }
      shareKey = live[0]
    }
  }
  const explicitShare = is.str(share)

  //* Determine which renderer to use ==============================
  // Entry-specific defaults:
  // - @react-three/fiber/webgpu: always WebGPU, no renderer prop needed (no webgl loader)
  // - @react-three/fiber/legacy: always WebGL (no webgpu loader)
  // - @react-three/fiber: WebGL unless the renderer prop, `primary`, or a primary to share asks
  //   for WebGPU; only the chosen renderer's support is downloaded (both loaders are dynamic
  //   imports)
  const wantsGL =
    !!webgl && (state.isLegacy || !!glConfig || !webgpu || (!rendererConfig && !primary && shareKey === undefined))

  // Deprecation warning for WebGL usage (only on the entry that offers both)
  if (webgl && webgpu && !state.isLegacy && wantsGL) {
    notifyDepreciated({
      heading: 'WebGlRenderer Usage',
      body: 'WebGlRenderer usage is deprecated in favor of WebGPU. Import from /legacy directly or upgrade to WebGPU.',
      link: 'https://docs.pmnd.rs/react-three-fiber/api/renderer',
    })
  }

  let renderer = state.internal.actualRenderer as WebGPURenderer | WebGLRenderer

  if (!state.internal.actualRenderer) {
    return resolveThen(wantsGL ? webgl!() : webgpu!(), (support) => {
      registerThree(support.three)
      state.internal.support = support
      ensureStoreThreeObjects(store)
      if (support.kind === 'webgl') {
        //* WebGL path ---
        return resolveThen(resolveRenderer(glConfig, defaultGLProps, support.Renderer), (resolved) => {
          renderer = resolved.renderer as WebGLRenderer
          state.internal.actualRenderer = renderer
          state.internal.releaseRenderer = leaseRenderer(renderer, resolved.owned)
          // Set both gl and renderer to the WebGLRenderer for backwards compatibility
          // Self-reference primaryStore - this canvas is its own primary
          state.set({ isLegacy: true, gl: renderer, renderer: renderer, primaryStore: store })
        })
      }

      //* Find the primary to share ---
      // share="id" waits for that primary, however long it takes to mount (up to the timeout).
      // Automatic sharing waits only for a primary that has announced itself; null means it
      // unmounted before creating its renderer, and this canvas owns one instead.
      const primaryReady =
        shareKey === undefined ? null : explicitShare ? waitForPrimary(shareKey) : waitForAnnouncedPrimary(shareKey)

      return resolveThen(primaryReady, (primaryEntry) => {
        if (primaryEntry && primaryEntry.store.getState().webGPUSupported) {
          //* WebGPU Secondary Canvas path (shares renderer via CanvasTarget) ---
          // Use the primary's renderer. The lease keeps it alive while this canvas draws
          // with it, even if the primary unmounts first
          renderer = primaryEntry.renderer
          state.internal.actualRenderer = renderer
          state.internal.releaseRenderer = borrowRenderer(renderer)
          // Render after the primary unless this canvas's scheduler orders it itself
          state.internal.sharedAfter = primaryEntry.rootId

          // Create a CanvasTarget for this secondary canvas
          const canvasTarget = new support.CanvasTarget(canvas as HTMLCanvasElement)

          // Enable multi-canvas mode on the primary canvas
          primaryEntry.store.setState((prev) => ({
            internal: { ...prev.internal, isMultiCanvas: true },
          }))

          // Store secondary canvas info in internal state
          // primaryStore points to the primary canvas's store for shared TSL resources
          state.set((prev) => ({
            webGPUSupported: primaryEntry.store.getState().webGPUSupported,
            renderer: renderer,
            primaryStore: primaryEntry.store,
            internal: {
              ...prev.internal,
              canvasTarget,
              isMultiCanvas: true,
              isSecondary: true,
              targetId: shareKey === DEFAULT_PRIMARY ? undefined : shareKey,
            },
          }))
          return
        }

        if (primaryEntry) {
          //* WebGL2 fallback: own renderer (#3965) ---
          // The primary's renderer fell back to its WebGL2 backend (no navigator.gpu). A WebGL
          // context is bound to the canvas element it was created on, so setCanvasTarget cannot
          // redirect it onto this canvas: sharing it would draw this canvas's scene into the
          // primary's element and leave this one blank. This root constructs its own renderer,
          // exactly like a primary, with two differences:
          // - forceWebGL: the primary already answered the "is WebGPU available" question.
          //   Forcing the same backend guarantees parity (a primary forced onto WebGL2 must not
          //   leave this canvas on real WebGPU) and skips a second adapter probe.
          // - it never registers as a primary: a WebGL context is bound to the canvas it was
          //   created on, so this renderer is as unshareable as the primary's.
          // A sharing canvas has no renderer instance or factory (those opt out of sharing), so
          // its config is a props bag or nothing. It owns this renderer, so its bag applies.
          return resolveThen(
            createOwnedWebGPURenderer(
              { ...rendererBag, forceWebGL: true },
              defaultGPUProps,
              canvas,
              propsSize,
              dpr,
              support,
            ),
            (resolved) => {
              renderer = resolved.renderer

              const backend = renderer.backend
              const isWebGPUBackend = backend && 'isWebGPUBackend' in backend

              // Its own lease, exactly as a primary takes one: teardown releases it, and the
              // last release disposes a renderer R3F built. Nothing else borrows it
              state.internal.actualRenderer = renderer
              state.internal.releaseRenderer = leaseRenderer(renderer, resolved.owned)
              // This root owns its renderer, so it is a standalone root: no `isSecondary`
              // (that flag tells teardown the renderer and its default canvas target are
              // borrowed, and to skip XR teardown) and no `targetId`.
              // `sharedRendererFallback` records why this secondary stopped sharing.
              // GPU resources cannot cross GL contexts, so TSL resources stay local:
              // primaryStore self-references, as on any single canvas.
              state.set((prev) => ({
                webGPUSupported: isWebGPUBackend,
                renderer: renderer,
                primaryStore: store,
                internal: {
                  ...prev.internal,
                  canvasTarget: (renderer as WebGPURenderer).getCanvasTarget?.(),
                  sharedRendererFallback: true,
                },
              }))
            },
          )
        }

        //* WebGPU path ---
        // This path is taken when:
        // 1. @react-three/fiber/webgpu - always, even without the renderer prop
        // 2. @react-three/fiber with the renderer prop or `primary`
        // and there is no primary to share (or this canvas is the primary, or opted out).
        // If rendererConfig is undefined, resolveRenderer creates a default WebGPURenderer;
        // if it is a pre-initialized external renderer, init is skipped (#3651).
        return resolveThen(
          createOwnedWebGPURenderer(rendererConfig, defaultGPUProps, canvas, propsSize, dpr, support),
          (resolved) => {
            renderer = resolved.renderer

            const backend = renderer.backend
            const isWebGPUBackend = backend && 'isWebGPUBackend' in backend

            state.internal.actualRenderer = renderer
            state.internal.releaseRenderer = leaseRenderer(renderer, resolved.owned)
            // Set renderer to WebGPURenderer, gl stays null (not available in WebGPU-only)
            // Self-reference primaryStore - this canvas is its own primary
            state.set({ webGPUSupported: isWebGPUBackend, renderer: renderer, primaryStore: store })

            if (primary) {
              //* Register as Primary Canvas ==============================
              // Other canvases can share this renderer from now on.
              //
              // The primary's canvas target is the renderer's *own* default target, not a second
              // CanvasTarget wrapped around the same element. The renderer only ever sizes,
              // listens to, and builds GPU attachments for `renderer._canvasTarget`; a separate
              // wrapper shares the element but none of that, so sizing it moved the swap chain
              // while the renderer's depth buffer stayed at its construction size (300x150).
              // Without a secondary to flip `isMultiCanvas`, nothing ever called setCanvasTarget
              // on the wrapper, so a lone primary rendered with mismatched attachments on every
              // frame. One element, one target: whichever canvas is active, the target it sizes
              // is the one the renderer draws with.
              //
              // Optional-call: a mock or foreign renderer without canvas targets simply has
              // none, and the store then sizes the renderer directly.
              const canvasTarget = (renderer as WebGPURenderer).getCanvasTarget?.()
              state.internal.pendingRootId ??= canvasId || getScheduler().generateRootId()
              registerPrimary(primaryKey, renderer as WebGPURenderer, store, {
                token: primaryToken,
                rootId: state.internal.pendingRootId,
              })
              state.set((prev) => ({ internal: { ...prev.internal, canvasTarget } }))
            } else if (share !== false && !isInstanceOrFactory(rendererConfig)) {
              // This canvas would have shared a primary had one existed: a primary mounting later
              // warns that it is not adopted
              state.internal.untrackStandalone = trackStandalone(store)
            }
          },
        )
      })
    })
  }
}

type Renderer = WebGLRenderer | WebGPURenderer

interface LeaseRecord {
  owned: boolean
  leases: number
}

/** Keyed by renderer: every root sharing a renderer shares its record. */
const records = new WeakMap<Renderer, LeaseRecord>()

/** Resolves once an async dispose() settles, so teardown can finish after it */
type Release = () => void | Promise<void>

function take(renderer: Renderer, record: LeaseRecord): Release {
  record.leases++
  let released = false
  return () => {
    if (released) return
    released = true
    if (--record.leases > 0) return
    records.delete(renderer)
    if (record.owned) return disposeRenderer(renderer)
  }
}

/**
 * Take a lease for the root that obtained `renderer`. Returns its release, which is idempotent.
 * A renderer that is already leased keeps the ownership it was first leased with.
 */
export function leaseRenderer(renderer: Renderer, owned: boolean): Release {
  let record = records.get(renderer)
  if (!record) records.set(renderer, (record = { owned, leases: 0 }))
  return take(renderer, record)
}

/**
 * Take a lease for a root that borrows another root's renderer. Throws when that renderer has no
 * lease left, which means its owner already unmounted and released it.
 */
export function borrowRenderer(renderer: Renderer): Release {
  const record = records.get(renderer)
  if (!record) throw new Error('R3F: cannot share a renderer whose canvas has already unmounted')
  return take(renderer, record)
}

/**
 * Free an R3F-owned renderer. Only called from committed teardown, after the renderer's init has
 * settled, so disposal never races initialization.
 */
export function disposeRenderer(renderer: Renderer): void | Promise<void> {
  // three's WebGPURenderer.dispose() starts init when init never ran, and rejects unhandled when it
  // failed. Either way there is nothing to free yet
  if ((renderer as WebGPURenderer).hasInitialized?.() === false) return
  const warn = (error: unknown) => console.warn('[R3F] Error disposing renderer', error)
  // WebGLRenderer.dispose() frees programs and caches but keeps the context until garbage
  // collection, and browsers cap how many WebGL contexts may be live. WebGPURenderer has no
  // forceContextLoss: its backend releases the context inside dispose(). The context is released
  // even when dispose() fails
  const loseContext = () => {
    try {
      ;(renderer as WebGLRenderer).forceContextLoss?.()
    } catch (error) {
      warn(error)
    }
  }
  let disposed: unknown
  try {
    disposed = renderer.dispose ? renderer.dispose() : (renderer as WebGLRenderer).renderLists?.dispose?.()
  } catch (error) {
    warn(error)
  }
  // WebGPURenderer.dispose() is async from three r186
  if (typeof (disposed as PromiseLike<void> | undefined)?.then === 'function') {
    return Promise.resolve(disposed as PromiseLike<void>).then(loseContext, (error) => {
      warn(error)
      loseContext()
    })
  }
  loseContext()
}

/** The registry key of a `<Canvas primary>` without an `id`. Not a valid DOM id, so no user id collides. */
export const DEFAULT_PRIMARY = '\u0000r3f:primary'

export interface PrimaryCanvasEntry {
  /** The WebGPURenderer instance owned by this primary canvas */
  renderer: WebGPURenderer
  /** The zustand store for this canvas */
  store: RootStore
  /** The primary's scheduler root id; a sharing canvas renders after it by default */
  rootId?: string
}

interface RegisteredEntry extends PrimaryCanvasEntry {
  token?: object
}

/** Registry of primary canvases keyed by their id (or DEFAULT_PRIMARY) */
const primaryRegistry = new Map<string, RegisteredEntry>()

/** Owners that announced a primary on each key, before or after it registered */
const announcements = new Map<string, Set<object>>()

/** Owners whose Canvas was cleaned up and may be set up again in the same commit (Fast Refresh, remount) */
const withdrawing = new Set<object>()

/** Subscribers waiting for a primary canvas to register */
const pendingSubscribers = new Map<string, Array<(entry: PrimaryCanvasEntry | null) => void>>()

/** Canvases that built their own WebGPU renderer and would have shared one had a primary existed */
const standaloneRoots = new Set<object>()

/** Owners already told about standalone canvases, so each primary warns once */
const warnedLatePrimary = new WeakSet<object>()

/** A readable name for a registry key in messages */
export function describePrimary(key: string): string {
  return key === DEFAULT_PRIMARY ? '<Canvas primary>' : `<Canvas id="${key}" primary>`
}

function notify(key: string, entry: PrimaryCanvasEntry | null) {
  const subscribers = pendingSubscribers.get(key)
  if (!subscribers) return
  pendingSubscribers.delete(key)
  subscribers.forEach((callback) => callback(entry))
}

/** Whether `key` has a live owner: an announcement or a registration not being withdrawn */
function isLive(key: string): boolean {
  const owners = announcements.get(key)
  if (owners) for (const owner of owners) if (!withdrawing.has(owner)) return true
  const entry = primaryRegistry.get(key)
  return !!entry && !(entry.token && withdrawing.has(entry.token))
}

/**
 * Announce a primary on `key` before its renderer exists. Idempotent per owner; also cancels a
 * pending withdrawal by the same owner (a Canvas set up again in the same commit).
 */
export function announcePrimary(key: string, owner: object): void {
  withdrawing.delete(owner)
  let owners = announcements.get(key)
  if (!owners) announcements.set(key, (owners = new Set()))
  if (owners.has(owner)) return
  owners.add(owner)

  // Sharing is decided when a canvas creates its renderer: canvases that already built their own
  // are not adopted after the fact
  if (standaloneRoots.size > 0 && !warnedLatePrimary.has(owner) && isDevelopment()) {
    warnedLatePrimary.add(owner)
    console.warn(
      `R3F: ${describePrimary(key)} mounted after ${standaloneRoots.size} other WebGPU canvas(es) had already ` +
        'created their own renderer; those keep it and do not share the primary. Mount the primary with or ' +
        'before the canvases that share it, or give them share="id" so they wait for it.',
    )
  }
}

/**
 * Mark an owner as possibly going away. It stops counting as a primary for conflict checks and
 * auto-sharing until it announces again (same commit) or withdraws for good.
 */
export function markWithdrawing(owner: object): void {
  withdrawing.add(owner)
}

/**
 * Withdraw an owner's announcement and its registration. Canvases waiting to auto-share on this
 * key fall back to their own renderer once no owner is left. Existing borrowers keep their lease.
 */
export function withdrawPrimary(key: string, owner: object): void {
  withdrawing.delete(owner)
  const owners = announcements.get(key)
  if (owners) {
    owners.delete(owner)
    if (owners.size === 0) announcements.delete(key)
  }
  const entry = primaryRegistry.get(key)
  if (entry?.token === owner) primaryRegistry.delete(key)
  if (!isLive(key)) notify(key, null)
}

/**
 * Whether another owner claimed `key` first: announced before `owner`, or registered. The first
 * primary on a key keeps it, so of two primaries mounting together only the second one fails.
 */
export function primaryConflict(key: string, owner: object): boolean {
  const owners = announcements.get(key)
  if (owners) {
    for (const other of owners) {
      if (other === owner) break
      if (!withdrawing.has(other)) return true
    }
  }
  const entry = primaryRegistry.get(key)
  return !!entry && entry.token !== owner && !(entry.token && withdrawing.has(entry.token))
}

/** Keys of every live primary, announced or registered. */
export function livePrimaryKeys(): string[] {
  const keys = new Set<string>([...announcements.keys(), ...primaryRegistry.keys()])
  return [...keys].filter(isLive)
}

/**
 * Record a canvas that owns a WebGPU renderer only because no primary existed when it was created.
 * @returns Function that removes it again (on unmount)
 */
export function trackStandalone(owner: object): () => void {
  standaloneRoots.add(owner)
  return () => {
    standaloneRoots.delete(owner)
  }
}

/**
 * Register a primary canvas that can be targeted by secondary canvases.
 *
 * @param id - Registry key: the canvas id, or DEFAULT_PRIMARY
 * @param renderer - The WebGPURenderer owned by this canvas
 * @param store - The zustand store for this canvas
 * @param options - The owner token that announced it and its scheduler root id
 * @returns Cleanup function to unregister on unmount
 */
export function registerPrimary(
  id: string,
  renderer: WebGPURenderer,
  store: RootStore,
  options: { token?: object; rootId?: string } = {},
): () => void {
  // An owner that withdrew while its renderer was being created (the primary unmounted mid-setup)
  // must not publish a renderer no one will withdraw again
  if (options.token && !announcements.get(id)?.has(options.token)) return () => {}

  if (primaryRegistry.has(id)) {
    console.warn(`Canvas with id="${id}" already registered. Overwriting.`)
  }

  const entry: RegisteredEntry = { renderer, store, rootId: options.rootId, token: options.token }
  primaryRegistry.set(id, entry)

  // Notify any waiting secondary canvases
  notify(id, entry)

  return () => {
    // Only unregister if the current entry matches (prevents race conditions)
    const currentEntry = primaryRegistry.get(id)
    if (currentEntry?.renderer === renderer) {
      primaryRegistry.delete(id)
    }
  }
}

/**
 * Get a registered primary canvas by id.
 *
 * @param id - The id of the primary canvas to look up
 * @returns The primary canvas entry or undefined if not found
 */
export function getPrimary(id: string): PrimaryCanvasEntry | undefined {
  return primaryRegistry.get(id)
}

function subscribe(id: string, callback: (entry: PrimaryCanvasEntry | null) => void): () => void {
  if (!pendingSubscribers.has(id)) pendingSubscribers.set(id, [])
  pendingSubscribers.get(id)!.push(callback)
  return () => {
    const subscribers = pendingSubscribers.get(id)
    if (!subscribers) return
    const index = subscribers.indexOf(callback)
    if (index !== -1) subscribers.splice(index, 1)
    if (subscribers.length === 0) pendingSubscribers.delete(id)
  }
}

/**
 * Wait for a primary canvas to be registered (`share="id"`).
 * Returns immediately if already registered, otherwise waits, even through a primary remounting.
 *
 * @param id - The id of the primary canvas to wait for
 * @param timeout - Optional timeout in ms (default: 5000)
 * @returns Promise that resolves with the primary canvas entry
 */
export function waitForPrimary(id: string, timeout = 5000): Promise<PrimaryCanvasEntry> {
  // If already registered, return immediately
  const existing = primaryRegistry.get(id)
  if (existing) {
    return Promise.resolve(existing)
  }

  // Otherwise, subscribe and wait. A withdrawal notifies with null: keep waiting for the next one
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {}
    const timeoutId = setTimeout(() => {
      unsubscribe()
      reject(
        new Error(
          `Timeout waiting for canvas with id="${id}". Make sure a <Canvas id="${id}" primary> is mounted ` +
            `for share="${id}".`,
        ),
      )
    }, timeout)

    const callback = (entry: PrimaryCanvasEntry | null) => {
      if (!entry) {
        unsubscribe = subscribe(id, callback)
        return
      }
      clearTimeout(timeoutId)
      resolve(entry)
    }
    unsubscribe = subscribe(id, callback)
  })
}

/**
 * Wait for the primary announced on `key` to register (automatic sharing). Resolves `null` when no
 * primary is live on the key, now or once every owner has withdrawn: the canvas then builds its own
 * renderer instead of waiting for one that is not coming.
 *
 * @param key - The announced primary's registry key
 * @param timeout - Optional timeout in ms (default: 5000)
 */
export function waitForAnnouncedPrimary(key: string, timeout = 5000): Promise<PrimaryCanvasEntry | null> {
  const existing = primaryRegistry.get(key)
  if (existing && isLive(key)) return Promise.resolve(existing)
  if (!isLive(key)) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe()
      reject(
        new Error(
          `Timeout waiting for ${describePrimary(key)} to create its renderer. A canvas mounted next to it shares ` +
            'its renderer automatically; pass share={false} to give it its own.',
        ),
      )
    }, timeout)
    const unsubscribe = subscribe(key, (entry) => {
      clearTimeout(timeoutId)
      resolve(entry)
    })
  })
}

/**
 * Check if a primary canvas with the given id exists.
 *
 * @param id - The id to check
 * @returns True if a primary canvas with this id is registered
 */
export function hasPrimary(id: string): boolean {
  return primaryRegistry.has(id)
}

/**
 * Unregister a primary canvas. Called on unmount.
 *
 * @param id - The id of the primary canvas to unregister
 */
export function unregisterPrimary(id: string): void {
  primaryRegistry.delete(id)
}

/**
 * Get all registered primary canvas ids. Useful for debugging.
 */
export function getPrimaryIds(): string[] {
  return Array.from(primaryRegistry.keys())
}

/** Clear announcements and standalone tracking. Test helper; registrations go via unregisterPrimary. */
export function resetCanvasRegistry(): void {
  primaryRegistry.clear()
  announcements.clear()
  withdrawing.clear()
  pendingSubscribers.clear()
  standaloneRoots.clear()
}
