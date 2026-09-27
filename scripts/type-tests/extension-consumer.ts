// An extension package's view of @react-three/fiber/extension, compiled against the built
// declarations with skipLibCheck off.
import type { RootExtension, RootState, RootStore } from '../../packages/fiber/dist/extension'
import {
  context,
  registerRootExtension,
  setRenderOverride,
  useFrame,
  useStore,
  useThree,
} from '../../packages/fiber/dist/extension'
import type { Context } from 'react'

const extension: RootExtension = {
  name: 'consumer-test',
  setup: (store: RootStore) => (store.getState().isLegacy ? undefined : { frameloop: 'demand' }),
  dispose: (_store: RootStore) => {},
  hmr: (_store: RootStore) => {},
}
const unregister: () => void = registerRootExtension(extension)

declare const store: RootStore
setRenderOverride(store, () => {})
setRenderOverride(store, null)

const ctx: Context<RootStore> = context
const hooks = [useStore, useThree, useFrame] as const

declare const state: RootState
const width: number = state.size.width

void [unregister, ctx, hooks, width]
