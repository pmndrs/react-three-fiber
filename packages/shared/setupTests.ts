import 'regenerator-runtime/runtime'
import { pointerEventPolyfill } from './pointerEventPolyfill'

// Let React know that we'll be testing effectful components
// @ts-ignore
global.IS_REACT_ACT_ENVIRONMENT = true

pointerEventPolyfill()

// Mock scheduler to test React features
jest.mock('scheduler', () => require('scheduler/unstable_mock'))

// De-escalate react-dom/client warnings
const logError = global.console.error
global.console.error = (...args: any[]) => {
  if (args.join('').startsWith('Warning')) return global.console.warn(...args)
  return logError(...args)
}
