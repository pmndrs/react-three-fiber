// Direct type-file imports, not the #types barrel: the barrel side-effect-imports the JSX element
// augmentation (types/three.d.ts), which must not leak into the three-free extension entry.
import type { RootState, RootStore } from '../../types/store'

//* Root Extensions ==============================
// The one seam packages building on fiber (e.g. @react-three/tsl) use to attach per-root state and
// lifecycle without core knowing about them. Deliberately small: setup, dispose, hmr.
//
// No #three imports: this module ships in the three-free @react-three/fiber/extension entry.

export interface RootExtension {
  /** Unique name. Registering the same name again replaces the entry (HMR-safe); roots it already
   *  set up are not set up a second time, but get the new entry's dispose and hmr. */
  name: string
  /**
   * Called once per root, after its renderer exists and before `onCreated` and the first frame.
   * `isLegacy` and `primaryStore` are known by then, so an extension can skip WebGL roots or defer
   * to the primary canvas. Return fields to merge into the root's state, or nothing.
   */
  setup?(store: RootStore): Partial<RootState> | void
  /** Called when a root this extension set up unmounts. */
  dispose?(store: RootStore): void
  /** Called when `<Canvas>` detects hot module replacement (skipped with `hmr={false}`). */
  hmr?(store: RootStore): void
}

interface ExtensionRegistry {
  extensions: Map<string, RootExtension>
  /** Roots whose renderer exists and which have not unmounted. */
  roots: Set<RootStore>
  /** The extensions each root has been set up by, by name. */
  applied: WeakMap<RootStore, Map<string, RootExtension>>
}

// Every fiber entry bundles its own copy of core, so the registry lives on globalThis -- the same
// Symbol.for() pattern as the React context. An extension registered through one copy must see
// roots created by another.
const R3F_EXTENSIONS = Symbol.for('@react-three/fiber.extensions')

function getRegistry(): ExtensionRegistry {
  return ((globalThis as any)[R3F_EXTENSIONS] ??= {
    extensions: new Map(),
    roots: new Set(),
    applied: new WeakMap(),
  } satisfies ExtensionRegistry)
}

function setupRoot(registry: ExtensionRegistry, store: RootStore, extension: RootExtension): void {
  let applied = registry.applied.get(store)
  if (!applied) registry.applied.set(store, (applied = new Map()))
  if (applied.has(extension.name)) return
  applied.set(extension.name, extension)

  const patch = extension.setup?.(store)
  if (patch) store.setState(patch)
}

/**
 * Register an extension. It is set up on every live root immediately, and on every root created
 * afterwards. Returns a function that unregisters it: new roots are no longer set up, while roots
 * it already set up keep its state and still get its dispose when they unmount.
 */
export function registerRootExtension(extension: RootExtension): () => void {
  const registry = getRegistry()
  registry.extensions.set(extension.name, extension)
  for (const store of registry.roots) setupRoot(registry, store, extension)

  return () => {
    if (registry.extensions.get(extension.name) === extension) registry.extensions.delete(extension.name)
  }
}

/**
 * Point a root's default render job at a different render function, or back at
 * `renderer.render(scene, camera)` with `null`.
 *
 * The default job keeps everything else: the Canvas `fps` throttle, error propagation to the error
 * boundary, and backing off when a user `useFrame(..., { phase: 'render' })` job takes over.
 */
export function setRenderOverride(store: RootStore, render: (() => void) | null): void {
  store.getState().internal.renderOverride = render
}

//* Internal: called by the renderer and Canvas ==============================

/** @internal Run every registered extension's setup on a root whose renderer now exists. */
export function attachRootExtensions(store: RootStore): void {
  const registry = getRegistry()
  registry.roots.add(store)
  for (const extension of registry.extensions.values()) setupRoot(registry, store, extension)
}

/**
 * The extension to call for a root it set up: the currently registered one of that name (so a hot
 * re-registration's new code handles it), or the one that did the setup if it has since been
 * unregistered -- cleanup must still happen.
 */
function current(registry: ExtensionRegistry, setUpBy: RootExtension): RootExtension {
  return registry.extensions.get(setUpBy.name) ?? setUpBy
}

/** @internal Run dispose for every extension that set this root up, and forget the root. */
export function detachRootExtensions(store: RootStore): void {
  const registry = getRegistry()
  if (!registry.roots.delete(store)) return
  const applied = registry.applied.get(store)
  registry.applied.delete(store)
  if (!applied) return
  for (const setUpBy of applied.values()) current(registry, setUpBy).dispose?.(store)
}

/** @internal Forward a hot update to every extension that set this root up. */
export function notifyRootExtensionsHmr(store: RootStore): void {
  const registry = getRegistry()
  const applied = registry.applied.get(store)
  if (!applied) return
  for (const setUpBy of applied.values()) current(registry, setUpBy).hmr?.(store)
}
