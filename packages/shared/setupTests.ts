import 'regenerator-runtime/runtime'
import { pointerEventPolyfill } from './pointerEventPolyfill'

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

// Let React know that we'll be testing effectful components
global.IS_REACT_ACT_ENVIRONMENT = true

pointerEventPolyfill()

// Mock scheduler to test React features
jest.mock('scheduler', () => require('scheduler/unstable_mock'))

// Silence react-dom & react-dom/client mismatch in RTL
const logError = global.console.error
global.console.error = (...args: any[]) => {
  if (args.join('').startsWith('Warning')) return
  return logError(...args)
}

const { default: fetch, Request, Response } = require('node-fetch')
global.fetch = fetch
global.Request = Request
global.Response = Response
