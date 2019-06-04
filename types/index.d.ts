import { Canvas } from './src/canvas'
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
declare const apply: (args: any) => void
export {
  Canvas,
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
