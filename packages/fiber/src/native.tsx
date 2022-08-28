import { Node, ThreeElements } from './core/types'

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      primitive: Omit<Node<any>, 'args'>
    }
  }
}

export type { AttachFnType, AttachType, Node, ThreeElements, Catalogue, Instance, InstanceProps } from './core/types'
export type {
  Intersection,
  Subscription,
  Dpr,
  Size,
  Viewport,
  RenderCallback,
  Performance,
  RootState,
} from './core/store'
export type { ThreeEvent, Events, EventManager, ComputeFunction } from './core/events'
export type { ObjectMap, Camera } from './core/utils'
export * from './native/Canvas'
export { createTouchEvents as events } from './native/events'
export * from './core'
