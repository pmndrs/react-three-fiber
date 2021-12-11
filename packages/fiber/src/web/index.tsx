import * as THREE from 'three'
import * as React from 'react'
// @ts-ignore
import { ConcurrentRoot } from 'react-reconciler/constants'
import { UseStore } from 'zustand'

import { dispose, calculateDpr } from '../core/utils'
import { Renderer, createStore, StoreProps, isRenderer, context, RootState, Size } from '../core/store'
import { createRenderer, extend, Root } from '../core/renderer'
import { createLoop, addEffect, addAfterEffect, addTail } from '../core/loop'
import { createPointerEvents as events, getEventPriority } from './events'
import { EventManager } from '../core/events'

const roots = new Map<Element, Root>()
const { invalidate, advance } = createLoop(roots)
const { reconciler, applyProps } = createRenderer(roots, getEventPriority)

type Properties<T> = Pick<T, { [K in keyof T]: T[K] extends (_: any) => any ? never : K }[keyof T]>

type GLProps =
  | Renderer
  | ((canvas: HTMLCanvasElement) => Renderer)
  | Partial<Properties<THREE.WebGLRenderer> | THREE.WebGLRendererParameters>
  | undefined

export type RenderProps<TCanvas extends Element> = Omit<StoreProps, 'gl' | 'events' | 'size'> & {
  gl?: GLProps
  events?: (store: UseStore<RootState>) => EventManager<TCanvas>
  size?: Size
  onCreated?: (state: RootState) => void
}

const createRendererInstance = <TElement extends Element>(gl: GLProps, canvas: TElement): THREE.WebGLRenderer => {
  const customRenderer = (
    typeof gl === 'function' ? gl(canvas as unknown as HTMLCanvasElement) : gl
  ) as THREE.WebGLRenderer
  if (isRenderer(customRenderer)) return customRenderer

  const renderer = new THREE.WebGLRenderer({
    powerPreference: 'high-performance',
    canvas: canvas as unknown as HTMLCanvasElement,
    antialias: true,
    alpha: true,
    ...gl,
  })

  // Set color management
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  // Set gl props
  if (gl) applyProps(renderer as any, gl as any)

  return renderer
}

function createRoot<TCanvas extends Element>(canvas: TCanvas, config?: RenderProps<TCanvas>) {
  return {
    render: (element: React.ReactNode) => {
      let { gl, size, events, onCreated, ...props } = config || {}
      // Allow size to take on container bounds initially
      if (!size) {
        size = {
          width: canvas.parentElement?.clientWidth ?? 0,
          height: canvas.parentElement?.clientHeight ?? 0,
        }
      }

      let root = roots.get(canvas)
      let fiber = root?.fiber
      let store = root?.store
      let state = store?.getState()

      if (fiber && state) {
        // When a root was found, see if any fundamental props must be changed or exchanged

        // Check pixelratio
        if (props.dpr !== undefined && state.viewport.dpr !== calculateDpr(props.dpr)) state.setDpr(props.dpr)
        // Check size
        if (state.size.width !== size.width || state.size.height !== size.height) state.setSize(size.width, size.height)
        // Check frameloop
        if (state.frameloop !== props.frameloop) state.setFrameloop(props.frameloop)

        // For some props we want to reset the entire root

        // Changes to the color-space
        const linearChanged = props.linear !== state.internal.lastProps.linear
        if (linearChanged) {
          unmountComponentAtNode(canvas)
          fiber = undefined
        }
      }

      if (!fiber) {
        // If no root has been found, make one

        // Create gl
        const glRenderer = createRendererInstance(gl, canvas)

        // Create store
        store = createStore(applyProps, invalidate, advance, { gl: glRenderer, size, ...props })
        const state = store.getState()
        // Create renderer
        fiber = reconciler.createContainer(store, ConcurrentRoot, false, null)
        // Map it
        roots.set(canvas, { fiber, store })
        // Store events internally
        if (events) state.set({ events: events(store) })
      }

      if (store && fiber) {
        reconciler.updateContainer(
          <Provider store={store} element={element} onCreated={onCreated} target={canvas} />,
          fiber,
          null,
          () => undefined,
        )
        return store
      } else {
        throw 'Error creating root!'
      }
    },
    unmount: () => unmountComponentAtNode(canvas),
  }
}

function render<TCanvas extends Element>(
  element: React.ReactNode,
  canvas: TCanvas,
  config: RenderProps<TCanvas> = {},
): UseStore<RootState> {
  console.warn('R3F.render is no longer supported in React 18. Use createRoot instead!')
  return createRoot(canvas, config).render(element)
}

function Provider<TElement extends Element>({
  store,
  element,
  onCreated,
  target,
}: {
  onCreated?: (state: RootState) => void
  store: UseStore<RootState>
  element: React.ReactNode
  target: TElement
}) {
  React.useEffect(() => {
    const state = store.getState()
    // Flag the canvas active, rendering will now begin
    state.set((state) => ({ internal: { ...state.internal, active: true } }))
    // Connect events
    state.events.connect?.(target)
    // Notifiy that init is completed, the scene graph exists, but nothing has yet rendered
    if (onCreated) onCreated(state)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <context.Provider value={store}>{element}</context.Provider>
}

function unmountComponentAtNode<TElement extends Element>(canvas: TElement, callback?: (canvas: TElement) => void) {
  const root = roots.get(canvas)
  const fiber = root?.fiber
  if (fiber) {
    const state = root?.store.getState()
    if (state) state.internal.active = false
    reconciler.updateContainer(null, fiber, null, () => {
      if (state) {
        setTimeout(() => {
          try {
            state.events.disconnect?.()
            state.gl?.renderLists?.dispose?.()
            state.gl?.forceContextLoss?.()
            if (state.gl?.xr) state.internal.xr.disconnect()
            dispose(state)
            roots.delete(canvas)
            if (callback) callback(canvas)
          } catch (e) {
            /* ... */
          }
        }, 500)
      }
    })
  }
}

const act = (React as any).unstable_act
function createPortal(children: React.ReactNode, container: THREE.Object3D): React.ReactNode {
  return reconciler.createPortal(children, container, null, null)
}

reconciler.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === 'production' ? 0 : 1,
  rendererPackageName: '@react-three/fiber',
  version: '18.0.0',
})

export * from '../core/hooks'
export {
  context,
  render,
  createRoot,
  unmountComponentAtNode,
  createPortal,
  events,
  reconciler,
  applyProps,
  dispose,
  invalidate,
  advance,
  extend,
  addEffect,
  addAfterEffect,
  addTail,
  act,
  roots as _roots,
}
