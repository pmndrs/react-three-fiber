import { setRenderOverride } from '@react-three/fiber/extension'
import type { RootStore } from '@react-three/fiber/extension'
import type { RenderPipeline } from 'three/webgpu'

// Who owns a canvas's render pipeline. A useRenderPipeline call that passes a callback is an owner:
// it creates a pipeline and scene pass of its own and frees them when it unmounts. A call without
// callbacks is a reader and never creates, keeps alive or frees anything.
//
// Owners stack per canvas. The most recently mounted one renders; when it goes away, the one below
// it takes over again with the graph it already built. Release is deferred a task, so the
// cleanup-then-setup React runs for StrictMode and Fast Refresh (refs survive both) cancels it and
// the graph is reused instead of rebuilt.

/** One configuring useRenderPipeline call and the GPU resources it created. */
export interface PipelineOwner {
  readonly store: RootStore
  pipeline: RenderPipeline | null
  /** The default scene pass, with the scene/camera it was built for */
  scenePass: { sceneUuid: string; cameraUuid: string; node: ScenePassNode } | null
  /** This owner's record, published as `state.passes` while it is the active owner */
  passes: PassRecord
  /** False between an effect cleanup and the next setup, and after unmount */
  mounted: boolean
  /** Pending deferred release, set by an effect cleanup */
  releaseTimer: ReturnType<typeof setTimeout> | null
  /** Re-run the owner's callbacks against a fresh scene pass (its hook's rebuild()) */
  rebuild(): void
}

const owners = new WeakMap<RootStore, PipelineOwner[]>()
const warned = new WeakSet<RootStore>()

export function createOwner(store: RootStore, rebuild: () => void): PipelineOwner {
  return { store, pipeline: null, scenePass: null, passes: {}, mounted: false, releaseTimer: null, rebuild }
}

/** Free everything the owner created. Idempotent; the owner can build again afterwards. */
export function disposeOwnerResources(owner: PipelineOwner): void {
  owner.scenePass?.node.dispose()
  owner.pipeline?.dispose()
  owner.scenePass = null
  owner.pipeline = null
  owner.passes = {}
}

/** The owner whose pipeline the canvas renders through, if any. */
export function activeOwner(store: RootStore): PipelineOwner | undefined {
  return owners.get(store)?.at(-1)
}

/** Render through the store's current pipeline, read at call time so a hand-over takes effect. */
function renderThroughPipeline(store: RootStore): () => void {
  return () => {
    const pipeline = store.getState().renderPipeline
    if (pipeline?.render) pipeline.render()
  }
}

/** Make the owner a live owner of its canvas. Cancels its own pending release (a remount). */
export function claimOwnership(owner: PipelineOwner): void {
  if (owner.releaseTimer !== null) clearTimeout(owner.releaseTimer)
  owner.releaseTimer = null
  owner.mounted = true

  let list = owners.get(owner.store)
  if (!list) owners.set(owner.store, (list = []))
  if (list.includes(owner)) return

  if (list.some((other) => other.mounted) && !warned.has(owner.store)) {
    warned.add(owner.store)
    if (typeof process === 'undefined' || process.env.NODE_ENV !== 'production') {
      console.warn(
        "[useRenderPipeline] More than one mounted component configures this canvas's render pipeline. " +
          'The most recently mounted one renders; the others take over again when it unmounts.',
      )
    }
  }
  list.push(owner)
}

/** Put the owner's pipeline and passes on the store, if it is the active owner. */
export function publishOwner(owner: PipelineOwner): void {
  if (activeOwner(owner.store) !== owner || !owner.pipeline) return
  owner.store.setState({ renderPipeline: owner.pipeline, passes: owner.passes })
  setRenderOverride(owner.store, renderThroughPipeline(owner.store))
}

/** Release the owner after the current task, unless a remount claims it first. */
export function scheduleRelease(owner: PipelineOwner): void {
  owner.mounted = false
  if (owner.releaseTimer !== null) return
  owner.releaseTimer = setTimeout(() => releaseOwner(owner))
}

/**
 * Stop the owner being an owner and free what it created. If it was rendering, the owner below it
 * takes over, or the canvas goes back to plain `renderer.render()`.
 */
export function releaseOwner(owner: PipelineOwner): void {
  if (owner.releaseTimer !== null) clearTimeout(owner.releaseTimer)
  owner.releaseTimer = null

  const { store } = owner
  const list = owners.get(store)
  const index = list?.indexOf(owner) ?? -1
  if (list && index !== -1) {
    const wasActive = index === list.length - 1
    list.splice(index, 1)
    if (wasActive) {
      // Hand over before freeing, so nothing can render against the disposed pipeline
      const next = activeOwner(store)
      if (next) {
        publishOwner(next)
      } else {
        store.setState({ renderPipeline: null, passes: {} })
        setRenderOverride(store, null)
      }
    }
  }
  disposeOwnerResources(owner)
}

/** Canvas unmount: free every owner's resources now, before the renderer is released. */
export function releaseAllOwners(store: RootStore): void {
  const list = owners.get(store)
  if (!list) return
  owners.delete(store)
  for (const owner of list) {
    if (owner.releaseTimer !== null) clearTimeout(owner.releaseTimer)
    owner.releaseTimer = null
    disposeOwnerResources(owner)
  }
}
