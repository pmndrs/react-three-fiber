/**
 * @fileoverview Dev-only notice for node materials attached under the legacy WebGLRenderer.
 *
 * Omitting `renderer` on <Canvas> (default entry) gives the legacy WebGLRenderer, which cannot
 * compile node materials: three's WebGL shader compiler dies on the first frame with an
 * unactionable `Cannot read properties of undefined (reading 'replace')`. This check runs when
 * a material is attached, so the hint lands in the console before that error does.
 *
 * @see https://github.com/pmndrs/react-three-fiber/issues/3889
 */
import { R3F_BUILD_LEGACY, R3F_BUILD_WEBGPU } from '#three'
import type { Instance, RootState, RootStore } from '#types'

// Structural rather than THREE.NodeMaterial: the legacy #three entry does not export it. Kept
// private so it does not join the public `is*` guards.
const isNodeMaterial = (value: unknown): value is { isNodeMaterial: true } =>
  !!(value as { isNodeMaterial?: boolean } | null | undefined)?.isNodeMaterial

// Roots whose renderer has already been checked. A root's renderer never changes after
// configure(), so one verdict per root is enough and the warning fires at most once per root.
const checkedRoots = new WeakSet<RootStore>()

const WEBGPU_AVAILABLE_HINT =
  'A node material was attached, but this canvas is running the legacy WebGLRenderer, which cannot compile node materials. ' +
  'Pass `renderer` to <Canvas> to opt into WebGPURenderer (it falls back to WebGL2 automatically, so browser WebGPU support is not required).'

const LEGACY_ENTRY_HINT =
  'A node material was attached, but @react-three/fiber/legacy only provides the legacy WebGLRenderer, which cannot compile node materials. ' +
  'Import from @react-three/fiber or @react-three/fiber/webgpu and pass `renderer` to <Canvas> to use WebGPURenderer (it falls back to WebGL2 automatically, so browser WebGPU support is not required).'

/**
 * Warns once per root when a node material is attached under the legacy WebGLRenderer.
 * Dev-only, and dead code on the WebGPU-only entry, which has no WebGLRenderer to run under.
 * A WebGPURenderer on its WebGL2 backend is fine: it compiles node materials itself.
 *
 * @param instance - The instance that was just attached
 */
export function warnIfNodeMaterialOnLegacyRenderer(instance: Instance): void {
  if (!R3F_BUILD_LEGACY) return
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') return
  if (!isNodeMaterial(instance.object)) return

  const root = instance.root
  if (checkedRoots.has(root)) return
  checkedRoots.add(root)

  const state = root.getState()
  if (state.internal.actualRenderer) return check(state)

  // The renderer is not known yet. root.render() waits for configure() to settle before it
  // mounts anything, so this is not reachable through <Canvas> or createRoot today, but the
  // renderer is created asynchronously and nothing here should depend on that ordering.
  // Wait for the store update that publishes it and give the verdict then.
  const unsubscribe = root.subscribe((next) => {
    if (!next.internal.actualRenderer) return
    unsubscribe()
    check(next)
  })
}

function check(state: RootState): void {
  if (!state.isLegacy) return
  console.warn(`R3F: ${R3F_BUILD_WEBGPU ? WEBGPU_AVAILABLE_HINT : LEGACY_ENTRY_HINT}`)
}
