/**
 * A minimal Fast Refresh driver for tests, with no dependency on `react-refresh`.
 *
 * React's development builds hand their hot-reload entry points (`setRefreshHandler`,
 * `scheduleRefresh`) to the DevTools global hook when they load. This module installs a bare hook
 * that keeps them, and `hotSwap(prev, next)` then does what react-refresh's runtime does when a
 * module is edited: every mounted fiber of `prev` re-renders as `next`, keeping its state, with
 * React replaying all of its effects (including `[]` and insertion effects) in that commit.
 *
 * It must run before `react-dom` loads, so import it first in the test file.
 */

type Family = { current: unknown }
type RefreshUpdate = { staleFamilies: Set<Family>; updatedFamilies: Set<Family> }
type RendererInternals = {
  scheduleRefresh?: (root: FiberRoot, update: RefreshUpdate) => void
  setRefreshHandler?: (handler: ((type: unknown) => Family | undefined) | null) => void
}
type FiberRoot = { current: { memoizedState?: { element?: unknown } | null } }

const renderers = new Map<number, RendererInternals>()
const mountedRoots = new Map<number, Set<FiberRoot>>()
const families = new Map<unknown, Family>()

;(globalThis as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
  supportsFiber: true,
  renderers,
  inject(internals: RendererInternals) {
    const id = renderers.size + 1
    renderers.set(id, internals)
    mountedRoots.set(id, new Set())
    internals.setRefreshHandler?.((type) => families.get(type))
    return id
  },
  onCommitFiberRoot(id: number, root: FiberRoot) {
    const roots = mountedRoots.get(id)
    if (root.current.memoizedState?.element != null) roots?.add(root)
    else roots?.delete(root)
  },
  onCommitFiberUnmount() {},
  onPostCommitFiberRoot() {},
}

/** Whether a React development build registered with the hook (i.e. this ran before it loaded). */
export const refreshAvailable = () => [...renderers.values()].some((r) => typeof r.scheduleRefresh === 'function')

/** Replace component `prev` with `next` in every mounted tree, as editing its module would. */
export function hotSwap(prev: unknown, next: unknown) {
  const family = families.get(prev) ?? { current: prev }
  family.current = next
  families.set(prev, family)
  families.set(next, family)

  for (const [id, internals] of renderers) {
    for (const root of mountedRoots.get(id) ?? []) {
      internals.scheduleRefresh?.(root, { staleFamilies: new Set(), updatedFamilies: new Set([family]) })
    }
  }
}

/** The nearest function component named `name` above a host node, read from React's fiber. */
export function findComponentType(node: Element, name: string): ((props: any) => any) | undefined {
  const key = Object.keys(node).find((k) => k.startsWith('__reactFiber$'))
  let fiber = key ? (node as any)[key] : null
  while (fiber && !(typeof fiber.type === 'function' && fiber.type.name === name)) fiber = fiber.return
  return fiber?.type
}
