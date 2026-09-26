import { useContext } from 'react'
import { context } from '../context'

//* Type Imports ==============================
// Direct type-file imports, not the #types barrel: the barrel side-effect-imports the JSX element
// augmentation (types/three.d.ts), which must not leak into the three-free extension entry.
import type { RootState, RootStore } from '../../../types/store'

// Kept in a leaf module with no #three imports so the @react-three/fiber/extension entry can ship
// these two hooks without a copy of core. Re-exported from ./index for everything else.

/**
 * Returns the R3F Canvas' Zustand store. Useful for [transient updates](https://github.com/pmndrs/zustand#transient-updates-for-often-occurring-state-changes).
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usestore
 */
export function useStore(): RootStore {
  const store = useContext(context)
  if (!store) throw new Error('R3F: Hooks can only be used within the Canvas component!')
  return store
}

/**
 * Accesses R3F's internal state, containing renderer, canvas, scene, etc.
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usethree
 */
export function useThree<T = RootState>(
  selector: (state: RootState) => T = (state) => state as unknown as T,
  equalityFn?: <T>(state: T, newState: T) => boolean,
): T {
  return useStore()(selector, equalityFn)
}
