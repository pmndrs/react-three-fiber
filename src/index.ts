import { addEffect, invalidate, render, unmountComponentAtNode, extend, applyProps, createPortal } from './reconciler'

const apply = (objects: object): void => {
  console.warn('react-three-fiber: Please use extend ✅ instead of apply ❌, the former will be made obsolete soon!')
  extend(objects)
}

export * from './three-types'
export * from './hooks'

export { addEffect, invalidate, render, createPortal, unmountComponentAtNode, apply, extend, applyProps }
