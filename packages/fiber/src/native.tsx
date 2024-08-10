export * from './three-types'
import * as ReactThreeFiber from './three-types'
export { ReactThreeFiber }
export type { BaseInstance, LocalState } from './core/renderer'
export type {
  Intersection,
  Subscription,
  Dpr,
  Size,
  Viewport,
  RenderCallback,
  Performance,
  RootState,
} from './core/store'
export type { ThreeEvent, Events, EventManager, ComputeFunction } from './core/events'
export { createEvents } from './core/events'
export type { ObjectMap, Camera } from './core/utils'
export * from './native/Canvas'
export { createTouchEvents as events } from './native/events'
export { createPointerEvents } from './web/events'
export type { GlobalRenderCallback, GlobalEffectType } from './core/loop'
export * from './core'

import { Platform } from 'react-native'
import { polyfills } from './native/polyfills'

if (Platform.OS !== 'web') polyfills()
