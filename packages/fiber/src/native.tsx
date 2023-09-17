import * as ReactThreeFiber from './three-types'
export { ReactThreeFiber }
export * from './three-types'
export * from './core'
export * from './native/Canvas'
export { createTouchEvents as events } from './native/events'

import { polyfills } from './native/polyfills'
polyfills()
