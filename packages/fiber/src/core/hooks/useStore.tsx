import * as React from 'react'
import { context, RootStore } from '../store'

/**
 * Returns the R3F Canvas' Zustand store. Useful for [transient updates](https://github.com/pmndrs/zustand#transient-updates-for-often-occurring-state-changes).
 * @see https://docs.pmnd.rs/react-three-fiber/api/hooks#usestore
 */
export function useStore(): RootStore {
  const store = React.useContext(context)
  if (!store) throw new Error('R3F: Hooks can only be used within the Canvas component!')
  return store
}
