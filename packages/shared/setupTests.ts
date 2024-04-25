import 'regenerator-runtime/runtime'
import { pointerEventPolyfill } from './pointerEventPolyfill'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
  var IS_REACT_NATIVE_TEST_ENVIRONMENT: boolean // https://github.com/facebook/react/pull/28419
}

// Let React know that we'll be testing effectful components
global.IS_REACT_ACT_ENVIRONMENT = true
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true // hide react-test-renderer warnings

pointerEventPolyfill()

// Silence react-dom & react-dom/client mismatch in RTL
const logError = global.console.error
global.console.error = (...args: any[]) => {
  if (args.join('').startsWith('Warning')) return
  return logError(...args)
}
