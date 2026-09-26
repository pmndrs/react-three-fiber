/**
 * @fileoverview Dev-only notice for node materials used under the legacy WebGLRenderer.
 *
 * Omitting `renderer` on <Canvas> gives the legacy WebGLRenderer, which cannot compile node
 * materials: three's WebGL shader compiler dies on the first frame with an unactionable
 * `Cannot read properties of undefined (reading 'replace')`.
 *
 * A node material element (`<meshStandardNodeMaterial />`) no longer gets that far: a WebGL root
 * resolves element names against `three`, which has no node materials, so the reconciler throws
 * with `NODE_MATERIAL_ON_WEBGL_HINT` appended. A node material instance made by the app (a
 * `<primitive>`, a `material` prop, an `extend()`ed class) still reaches the renderer, so it is
 * checked when attached, and the hint lands in the console before three's error does.
 *
 * @see https://github.com/pmndrs/react-three-fiber/issues/3889
 */
import type { RootState, RootStore } from '#types'

/** How to get a renderer that compiles node materials. */
export const NODE_MATERIAL_ON_WEBGL_HINT =
  'Node materials need WebGPURenderer, but this canvas is running the legacy WebGLRenderer. ' +
  'Pass `renderer` to <Canvas> (from @react-three/fiber or @react-three/fiber/webgpu; @react-three/fiber/legacy is WebGL only). ' +
  'WebGPURenderer falls back to WebGL2 automatically, so browser WebGPU support is not required.'

/** Whether an element name is a node material class (`MeshStandardNodeMaterial`, ...). */
export const isNodeMaterialName = (name: string): boolean => name.endsWith('NodeMaterial')

// Structural: core never imports three/webgpu, where NodeMaterial lives. Kept private so it does
// not join the public `is*` guards.
const isNodeMaterial = (value: unknown): value is { isNodeMaterial: true } =>
  !!(value as { isNodeMaterial?: boolean } | null | undefined)?.isNodeMaterial

// Roots whose renderer has already been checked. A root's renderer never changes after
// configure(), so one verdict per root is enough and the warning fires at most once per root.
const checkedRoots = new WeakSet<RootStore>()

/**
 * Warns once per root when a node material is attached under the legacy WebGLRenderer. Dev-only.
 * A WebGPURenderer on its WebGL2 backend is fine: it compiles node materials itself.
 *
 * Called for both ways a material reaches an object: a child element attached by the reconciler
 * (`<primitive object={m} attach="material" />`, an `extend()`ed node material) and a `material`
 * prop (`<mesh material={m} />`, including multi-material arrays).
 *
 * @param root - Store of the root the material is being attached under
 * @param material - The attached object or `material` prop value (may be an array)
 */
export function warnIfNodeMaterialOnLegacyRenderer(root: RootStore, material: unknown): void {
  // Bare `process.env.NODE_ENV`, like the bundled react-reconciler: consumer bundlers replace it
  // statically, which makes this whole body dead code in production. A `typeof process` guard
  // would survive that replacement and, since `process` is undefined in a browser, keep the
  // check (and the message) alive in production builds.
  if (process.env.NODE_ENV === 'production') return
  if (!root || checkedRoots.has(root)) return
  if (!(Array.isArray(material) ? material.some(isNodeMaterial) : isNodeMaterial(material))) return
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
  console.warn(`R3F: A node material was attached. ${NODE_MATERIAL_ON_WEBGL_HINT}`)
}
