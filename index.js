import { Canvas } from './src/canvas.tsx'
import { useRender, useThree, useUpdate, useResource } from './src/hooks.tsx'
import {
  addEffect,
  invalidate,
  render,
  unmountComponentAtNode,
  extend,
  applyProps,
  createPortal,
} from './src/reconciler.tsx'

const apply = args => {
  console.warn('react-three-fiber: Please use extend ✅ instead of apply ❌, the former will be made obsolete soon!')
  extend(args)
}

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
