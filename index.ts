/// <reference path="types/three.d.ts" />

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

export {
  Canvas,
  addEffect,
  invalidate,
  render,
  createPortal,
  unmountComponentAtNode,
  extend,
  applyProps,
  useRender,
  useThree,
  useUpdate,
  useResource,
}
