// EXPERIMENTAL (A5): API may change before stable. A reactive, refcounted Texture registry.
import { useMemo } from 'react'
import { useStore, useThree } from './'
import type { RootState } from '#types'
import { Texture as _Texture } from '#three'

//* Types ==============================

/** Accepted shapes for a registry read: a single key, a list of keys, or a name→key map. */
export type TextureInput = string | string[] | Record<string, string>

/** Result of a `get()` read, mirroring the input shape. */
export type TextureResult<Input extends TextureInput> = Input extends string
  ? _Texture | undefined
  : Input extends string[]
    ? (_Texture | undefined)[]
    : { [K in keyof Input]: _Texture | undefined }

/** Options for `dispose()`. */
export interface DisposeOptions {
  /** Dispose even if the texture still has active references (default false). */
  force?: boolean
}

export interface UseTexturesReturn {
  /** The live registry Map (key → Texture). Treat as read-only. */
  readonly all: Map<string, _Texture>

  // Read --
  /** Read one texture, an array of textures, or a name→texture record (mirrors the input shape). */
  get<Input extends TextureInput>(input: Input): TextureResult<Input>
  /** Check whether a key exists in the registry. */
  has(key: string): boolean

  // Write --
  /**
   * Register a texture (or a record of textures) that has no URL — e.g. a render
   * target or procedural texture. URL-loaded textures are registered automatically
   * by `useTexture` (registry enrollment is on by default).
   */
  add(key: string, texture: _Texture): void
  add(record: Record<string, _Texture>): void

  // Lifecycle --
  /**
   * Dispose a texture's GPU resources and remove it from the registry.
   * Refcount-aware: if the key is still in use by a mounted `useTexture` consumer it is
   * skipped (with a warning) unless `{ force: true }` is passed.
   * @returns true if disposed, false if skipped.
   */
  dispose(key: string, options?: DisposeOptions): boolean
  /** Dispose every texture in the registry and clear it. Use on scene teardown. */
  disposeAll(): void
}

//* Hook ==============================

/**
 * Reactive Texture registry — load once with `useTexture`, reach the textures from anywhere.
 *
 * This is a registry of plain `Texture` objects (not TSL nodes), so the same texture can feed
 * a material map, a heightmap sampler, or anything else. It does **not** load — pair it with
 * `useTexture` for loading (registry enrollment is on by default); `useTextures` is for access and lifecycle.
 *
 * The returned handle is **reactive**: the calling component re-renders when the registry
 * changes. Pass a selector to scope the subscription to a single read.
 *
 * @example
 * ```tsx
 * // Load + register once (anywhere in the tree) — registered by default
 * useTexture({ map: '/diffuse.jpg', normalMap: '/normal.jpg' })
 *
 * // Reach them from another component — record form lands straight into a material
 * const { map, normalMap } = useTextures().get({ map: '/diffuse.jpg', normalMap: '/normal.jpg' })
 * return <meshStandardMaterial map={map} normalMap={normalMap} />
 *
 * // A set of heightmaps at once
 * const [a, b, c] = useTextures().get(['/h0.png', '/h1.png', '/h2.png'])
 *
 * // Register a non-URL texture (render target / procedural)
 * useTextures().add('rt-main', renderTarget.texture)
 *
 * // Deliberate GPU cleanup (refcount-aware; force to override)
 * useTextures().dispose('/diffuse.jpg')
 * useTextures().disposeAll() // scene teardown
 * ```
 *
 * @remarks
 * **Future expansion:** an imperative async loader (e.g. `await useTextures().load('/x.jpg')`) is
 * intentionally not included yet. It would let non-React code (loading screens, dynamic streaming)
 * populate the registry without Suspense, at the cost of putting loading back into this hook. It
 * will be added only if a concrete consumer needs imperative loading; for now, loading lives in
 * `useTexture`.
 */
export function useTextures(): UseTexturesReturn
export function useTextures<T>(selector: (registry: UseTexturesReturn) => T): T
export function useTextures<T>(selector?: (registry: UseTexturesReturn) => T): UseTexturesReturn | T {
  const store = useStore()

  const registry = useMemo<UseTexturesReturn>(() => {
    const getState = store.getState
    const setState = store.setState

    const getOne = (key: string) => getState().textures.get(key)

    return {
      get all() {
        return getState().textures
      },

      get<Input extends TextureInput>(input: Input): TextureResult<Input> {
        if (typeof input === 'string') return getOne(input) as TextureResult<Input>
        if (Array.isArray(input)) return input.map(getOne) as TextureResult<Input>
        const out: Record<string, _Texture | undefined> = {}
        for (const name in input) out[name] = getOne((input as Record<string, string>)[name])
        return out as TextureResult<Input>
      },

      has: (key: string) => getState().textures.has(key),

      add(keyOrRecord: string | Record<string, _Texture>, texture?: _Texture) {
        setState((state) => {
          const textures = new Map(state.textures)
          if (typeof keyOrRecord === 'string') {
            textures.set(keyOrRecord, texture as _Texture)
          } else {
            for (const key in keyOrRecord) textures.set(key, keyOrRecord[key])
          }
          return { textures }
        })
      },

      dispose(key: string, options?: DisposeOptions): boolean {
        const state = getState()
        const refs = state._textureRefs.get(key) ?? 0
        if (refs > 0 && !options?.force) {
          console.warn(
            `[useTextures] "${key}" still has ${refs} active reference(s); skipping dispose. ` +
              `Pass { force: true } to override.`,
          )
          return false
        }
        state.textures.get(key)?.dispose()
        setState((s) => {
          const textures = new Map(s.textures)
          textures.delete(key)
          const nextRefs = new Map(s._textureRefs)
          nextRefs.delete(key)
          return { textures, _textureRefs: nextRefs }
        })
        return true
      },

      disposeAll() {
        for (const texture of getState().textures.values()) texture.dispose()
        setState({ textures: new Map(), _textureRefs: new Map() })
      },
    }
  }, [store])

  // Reactivity: subscribe to the whole registry, or scope to the selector's output.
  // A single useThree call (chosen by branch) keeps the rules of hooks happy.
  const subscribe = (selector ? () => selector(registry) : (state) => state.textures) as (state: RootState) => unknown
  const selected = useThree(subscribe)

  return selector ? (selected as T) : registry
}

export default useTextures
