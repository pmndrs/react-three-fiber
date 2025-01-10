import * as ReactThreeFiber from './three-types'
export { ReactThreeFiber }
export * from './three-types'
export * from './core'
export * from './native/Canvas'
export { createTouchEvents as events } from './native/events'

import { Platform } from 'react-native'
import { polyfills } from './native/polyfills'

if (Platform.OS !== 'web') polyfills()
