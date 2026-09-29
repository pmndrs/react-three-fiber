import type { Texture } from 'three'
import type { RootStore } from '#types'

/**
 * @fileoverview Textures loaded during a render, visible before they are registered.
 *
 * `useTexture` registers what it loaded in a layout effect (a store write, so it cannot happen
 * during render). Until then, a hook later in the same render that reads the registry - a
 * `@react-three/tsl` creator calling `textures.get(url)` - would find nothing and build a graph
 * without the texture. So `useTexture` also STAGES its fresh textures here during render: plain
 * module state keyed by store, invisible to store subscribers. `getTextureView` overlays them on
 * the registry, and the layout effect drops them once they are registered.
 *
 * Staging holds no refcount and never touches the store, so a render React throws away leaves
 * nothing registered or retained: at most an entry here for a texture the loader cache already
 * holds, which dies with the store.
 */

type Staging = WeakMap<RootStore, Map<string, Texture>>

// Shared through Symbol.for(), like the context and the extension registry, so a copy of core
// in another bundle (the extension entry used by @react-three/tsl) sees the same staging.
const R3F_STAGED_TEXTURES = Symbol.for('@react-three/fiber.stagedTextures')
const globalStaging = globalThis as typeof globalThis & { [R3F_STAGED_TEXTURES]?: Staging }
const staging: Staging = (globalStaging[R3F_STAGED_TEXTURES] ??= new WeakMap())

/** Render phase: make freshly loaded textures visible to later readers. Skips registered URLs. */
export function stageTextures(store: RootStore, entries: Iterable<readonly [string, Texture]>): void {
  const registered = store.getState().textures
  let staged = staging.get(store)
  for (const [url, texture] of entries) {
    if (registered.has(url)) continue
    if (!staged) staging.set(store, (staged = new Map()))
    staged.set(url, texture)
  }
}

/** Commit phase: drop staged entries once they are registered. */
export function unstageTextures(store: RootStore, urls: Iterable<string>): void {
  const staged = staging.get(store)
  if (!staged) return
  for (const url of urls) staged.delete(url)
  if (staged.size === 0) staging.delete(store)
}

/**
 * The texture registry as a reader during render should see it: registered textures, plus those a
 * `useTexture` earlier in this render loaded but has not registered yet. Returns the registry Map
 * itself when nothing is staged. Read-only: register through `useTexture` / `useTextures().add`.
 */
export function getTextureView(store: RootStore): ReadonlyMap<string, Texture> {
  const registered = store.getState().textures
  const staged = staging.get(store)
  if (!staged) return registered

  const view = new Map(registered)
  for (const [url, texture] of staged) if (!view.has(url)) view.set(url, texture)
  return view
}
