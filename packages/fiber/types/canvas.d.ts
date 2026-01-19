import * as React from 'react'
import type { Options as ResizeOptions } from 'react-use-measure'
import type { RenderProps } from './renderer'

//* Canvas Types ==============================

export interface CanvasProps
  extends Omit<RenderProps<HTMLCanvasElement>, 'size'>,
    React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode
  ref?: React.Ref<HTMLCanvasElement>
  /** Canvas fallback content, similar to img's alt prop */
  fallback?: React.ReactNode
  /**
   * Options to pass to useMeasure.
   * @see https://github.com/pmndrs/react-use-measure#api
   */
  resize?: ResizeOptions
  /** The target where events are being subscribed to, default: the div that wraps canvas */
  eventSource?: HTMLElement | React.RefObject<HTMLElement>
  /** The event prefix that is cast into canvas pointer x/y events, default: "offset" */
  eventPrefix?: 'offset' | 'client' | 'page' | 'layer' | 'screen'
  /** Enable/disable automatic HMR refresh for TSL nodes and uniforms, default: true in dev */
  hmr?: boolean
}
