export * from './src/three-types'
export * from './src/canvas'
import { useRender, useThree, useUpdate, useResource } from './src/hooks'
import {
  addEffect,
  invalidate,
  render,
  unmountComponentAtNode,
  extend,
  applyProps,
  createPortal,
} from './src/reconciler'
declare const apply: (objects: object) => void
export {
  addEffect,
  invalidate,
  render,
  createPortal,
  unmountComponentAtNode,
  apply,
  extend,
  applyProps,
  useRender,
  useThree,
  useUpdate,
  useResource,
}
