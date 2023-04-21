import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import mitt from 'mitt'
import type { Options as ResizeOptions } from 'react-use-measure'
import { UseBoundStore } from 'zustand'

import {
  Canvas as CanvasImpl,
  extend,
  createRoot,
  createEvents,
  RenderProps,
  ReconcilerRoot,
  Dpr,
  Size,
  RootState,
  EventManager,
  Events,
  context,
  createPortal,
  reconciler,
  applyProps,
  dispose,
  invalidate,
  advance,
  addEffect,
  addAfterEffect,
  addTail,
  flushGlobalEffects,
  getRootState,
  act,
  ReactThreeFiber,
} from '@react-three/fiber'

export type {
  ObjectMap,
  Camera,
  ThreeEvent,
  Events,
  EventManager,
  ComputeFunction,
  GlobalRenderCallback,
  GlobalEffectType,
} from '@react-three/fiber'

export {
  ReactThreeFiber,
  context,
  createPortal,
  reconciler,
  applyProps,
  dispose,
  invalidate,
  advance,
  extend,
  addEffect,
  addAfterEffect,
  addTail,
  flushGlobalEffects,
  getRootState,
  act,
}

const DOM_EVENTS = {
  onClick: ['click', false],
  onContextMenu: ['contextmenu', false],
  onDoubleClick: ['dblclick', false],
  onWheel: ['wheel', true],
  onPointerDown: ['pointerdown', true],
  onPointerUp: ['pointerup', true],
  onPointerLeave: ['pointerleave', true],
  onPointerMove: ['pointermove', true],
  onPointerCancel: ['pointercancel', true],
  onLostPointerCapture: ['lostpointercapture', true],
} as const

export interface CanvasProps
  extends Omit<RenderProps<HTMLCanvasElement>, 'size'>,
    React.HTMLAttributes<HTMLDivElement> {
  worker: Worker
  fallback?: React.ReactNode
  /**
   * Options to pass to useMeasure.
   * @see https://github.com/pmndrs/react-use-measure#api
   */
  resize?: ResizeOptions
  /** The target where events are being subscribed to, default: the div that wraps canvas */
  eventSource?: HTMLElement | React.MutableRefObject<HTMLElement>
  /** The event prefix that is cast into canvas pointer x/y events, default: "offset" */
  eventPrefix?: 'offset' | 'client' | 'page' | 'layer' | 'screen'
}

export function Canvas({ worker, fallback, ...props }: CanvasProps) {
  const [shouldFallback, setFallback] = React.useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null!)

  useEffect(() => {
    if (!worker) return

    const canvas = canvasRef.current
    let offscreen
    try {
      offscreen = canvasRef.current.transferControlToOffscreen()
    } catch (e) {
      // Browser doesn't support offscreen canvas at all
      setFallback(true)
      return
    }

    worker.onmessage = (e) => {
      if (e.data.type === 'error') {
        // Worker failed to initialize
        setFallback(true)
      }
    }

    worker.postMessage(
      {
        type: 'init',
        payload: {
          props,
          drawingSurface: offscreen,
          width: canvas.clientWidth,
          height: canvas.clientHeight,
          top: canvas.offsetTop,
          left: canvas.offsetLeft,
          pixelRatio: window.devicePixelRatio,
        },
      },
      [offscreen],
    )

    Object.values(DOM_EVENTS).forEach(([eventName, passive]) => {
      canvas.addEventListener(
        eventName,
        (event: any) => {
          // Prevent default for all passive events
          if (!passive) event.preventDefault()
          // Capture pointer automatically on pointer down
          if (eventName === 'pointerdown') {
            event.target.setPointerCapture(event.pointerId)
          } else if (eventName === 'pointerup') {
            event.target.releasePointerCapture(event.pointerId)
          }

          worker.postMessage({
            type: 'dom_events',
            payload: {
              eventName,
              deltaX: event.deltaX,
              deltaY: event.deltaY,
              pointerId: event.pointerId,
              pointerType: event.pointerType,
              button: event.button,
              buttons: event.buttons,
              altKey: event.altKey,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              shiftKey: event.shiftKey,
              movementX: event.movementX,
              movementY: event.movementY,
              clientX: event.clientX,
              clientY: event.clientY,
              offsetX: event.offsetX,
              offsetY: event.offsetY,
              pageX: event.pageX,
              pageY: event.pageY,
              x: event.x,
              y: event.y,
            },
          })
        },
        { passive },
      )
    })

    const handleResize = () => {
      worker.postMessage({
        type: 'resize',
        payload: {
          width: canvas.clientWidth,
          height: canvas.clientHeight,
          top: canvas.offsetTop,
          left: canvas.offsetLeft,
        },
      })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [worker])

  useEffect(() => {
    if (!worker) return
    worker.postMessage({ type: 'props', payload: props })
  }, [worker, props])

  return shouldFallback ? <CanvasImpl {...props}>{fallback}</CanvasImpl> : <canvas ref={canvasRef} />
}

export function render(children: React.ReactNode) {
  extend(THREE)

  let root: ReconcilerRoot<HTMLCanvasElement>
  let dpr: Dpr = [1, 2]
  let size: Size = { width: 0, height: 0, top: 0, left: 0, updateStyle: false }
  const emitter = mitt()

  const handleInit = (payload: any) => {
    const { props, drawingSurface: canvas, width, top, left, height, pixelRatio } = payload
    try {
      Object.assign(canvas, {
        pageXOffset: left,
        pageYOffset: top,
        clientLeft: left,
        clientTop: top,
        clientWidth: width,
        clientHeight: height,
        style: { touchAction: 'none' },
        ownerDocument: canvas,
        documentElement: canvas,
        getBoundingClientRect() {
          return size
        },
        setAttribute() {},
        setPointerCapture() {},
        releasePointerCapture() {},
        addEventListener(event: string, callback: () => void) {
          emitter.on(event, callback)
        },
        removeEventListener(event: string, callback: () => void) {
          emitter.off(event, callback)
        },
      })

      root = createRoot(canvas)
      root.configure({
        events: createPointerEvents,
        size: (size = { width, height, top, left, updateStyle: false }),
        dpr: (dpr = Math.min(Math.max(1, pixelRatio), 2)),
        ...props,
      })
      root.render(children)
    } catch (e: any) {
      postMessage({ type: 'error', payload: e?.message })
    }

    // Shim window to the canvas from here on
    self.window = canvas
  }

  const handleResize = ({ width, height, top, left }: Size) => {
    if (!root) return
    root.configure({ size: (size = { width, height, top, left, updateStyle: false }), dpr })
  }

  const handleEvents = (payload: any) => {
    emitter.emit(payload.eventName, { ...payload, preventDefault() {}, stopPropagation() {} })
  }

  const handleProps = (payload: any) => {
    if (!root) return
    if (payload.dpr) dpr = payload.dpr
    root.configure({ size, dpr, ...payload })
  }

  const handlerMap = {
    resize: handleResize,
    init: handleInit,
    dom_events: handleEvents,
    props: handleProps,
  }

  self.onmessage = (event) => {
    const { type, payload } = event.data
    const handler = handlerMap[type as keyof typeof handlerMap]
    if (handler) handler(payload)
  }

  // Shims for web offscreen canvas
  // @ts-ignore
  self.window = {}
  // @ts-ignore
  self.document = {}

  /** R3F event manager for web offscreen canvas */
  function createPointerEvents(store: UseBoundStore<RootState>): EventManager<HTMLElement> {
    const { handlePointer } = createEvents(store)

    return {
      priority: 1,
      enabled: true,
      compute(event, state) {
        // https://github.com/pmndrs/react-three-fiber/pull/782
        // Events trigger outside of canvas when moved, use offsetX/Y by default and allow overrides
        state.pointer.set((event.offsetX / state.size.width) * 2 - 1, -(event.offsetY / state.size.height) * 2 + 1)
        state.raycaster.setFromCamera(state.pointer, state.camera)
      },

      connected: undefined,
      handlers: Object.keys(DOM_EVENTS).reduce(
        (acc, key) => ({ ...acc, [key]: handlePointer(key) }),
        {},
      ) as unknown as Events,
      connect: (target) => {
        const { set, events } = store.getState()
        events.disconnect?.()
        set((state) => ({ events: { ...state.events, connected: target } }))
        Object.entries(events?.handlers ?? []).forEach(([name, event]) => {
          const [eventName] = DOM_EVENTS[name as keyof typeof DOM_EVENTS]
          emitter.on(eventName as any, event as any)
        })
      },
      disconnect: () => {
        const { set, events } = store.getState()
        if (events.connected) {
          Object.entries(events.handlers ?? []).forEach(([name, event]) => {
            const [eventName] = DOM_EVENTS[name as keyof typeof DOM_EVENTS]
            emitter.off(eventName as any, event as any)
          })
          set((state) => ({ events: { ...state.events, connected: undefined } }))
        }
      },
    }
  }
}
