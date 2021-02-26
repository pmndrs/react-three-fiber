import * as React from 'react'
import create from 'zustand/vanilla'

import { is } from './helpers/is'
import { createContextState } from './helpers/gl'

import { CanvasProps, ReactThreeFiberContainer } from '../types/index'

import { Renderer, roots, invalidate, applyProps } from './renderer'

const hasSymbol = is.fun(Symbol) && Symbol.for
const REACT_PORTAL_TYPE = hasSymbol ? Symbol.for('react.portal') : 0xeaca

export function render(
  element: React.ReactNode,
  container: HTMLCanvasElement,
  state: Omit<CanvasProps, 'children'> = {}
) {
  let root = roots.get(container)
  if (!root) {
    ;(container as ReactThreeFiberContainer<typeof container>).__state = state
    const newRoot = create(() => ({
      root: Renderer.createContainer(
        container,
        state !== undefined && state.concurrent ? 2 : 0,
        false,
        // @ts-ignore
        null
      ),
      ...createContextState(container, state, { invalidate, applyProps }),
    }))
    root = newRoot
    roots.set(container, newRoot)
  }
  if (root) {
    const fiber = root.getState().root
    Renderer.updateContainer(element, fiber, null, () => undefined)
    console.log('R3F RENDER', fiber)
    return Renderer.getPublicRootInstance(fiber)
  }
}

export function unmountComponentAtNode(container: HTMLCanvasElement, callback?: (c: HTMLCanvasElement) => void) {
  const fiberRoot = roots.get(container)?.getState().root
  if (fiberRoot) {
    Renderer.updateContainer(null, fiberRoot, null, () => {
      roots.delete(container)
      if (callback) callback(container)
    })
  }
}

export function createPortal(
  children: React.ReactNode,
  containerInfo: any,
  implementation?: any,
  key: any = null
): React.ReactNode {
  if (!containerInfo.__objects) containerInfo.__objects = []
  return {
    $$typeof: REACT_PORTAL_TYPE,
    key: key == null ? null : '' + key,
    children,
    containerInfo,
    implementation,
  }
}
