import { Canvas } from './canvas'
import { useRender, useThree, useUpdate, useResource } from './hooks'
import { addEffect, invalidate, render, unmountComponentAtNode, extend, applyProps, createPortal } from './reconciler'

const apply = (args: any) => {
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
