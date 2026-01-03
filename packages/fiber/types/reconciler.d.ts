import type { Scene, Color, ColorRepresentation } from 'three'
import type { RootStore } from './store'
import type { EventHandlers } from './events'
import type { IsAllOptional } from './utils'

//* Reconciler Types ==============================

export interface Root {
  fiber: import('react-reconciler').FiberRoot
  store: RootStore
}

export type AttachFnType<O = any> = (parent: any, self: O) => () => void
export type AttachType<O = any> = string | AttachFnType<O>

export type ConstructorRepresentation<T = any> = new (...args: any[]) => T

export interface Catalogue {
  [name: string]: ConstructorRepresentation
}

// TODO: handle constructor overloads
// https://github.com/pmndrs/react-three-fiber/pull/2931
// https://github.com/microsoft/TypeScript/issues/37079
export type Args<T> = T extends ConstructorRepresentation
  ? T extends typeof Color
    ? [r: number, g: number, b: number] | [color: ColorRepresentation]
    : ConstructorParameters<T>
  : any[]

type ArgsProp<P> = P extends ConstructorRepresentation
  ? IsAllOptional<ConstructorParameters<P>> extends true
    ? { args?: Args<P> }
    : { args: Args<P> }
  : { args: unknown[] }

export type InstanceProps<T = any, P = any> = ArgsProp<P> & {
  object?: T
  dispose?: null
  attach?: AttachType<T>
  onUpdate?: (self: T) => void
}

export interface Instance<O = any> {
  root: RootStore
  type: string
  parent: Instance | null
  children: Instance[]
  props: InstanceProps<O> & Record<string, unknown>
  object: O & { __r3f?: Instance<O> }
  eventCount: number
  handlers: Partial<EventHandlers>
  attach?: AttachType<O>
  previousAttach?: any
  isHidden: boolean
}

export interface HostConfig {
  type: string
  props: Instance['props']
  container: RootStore
  instance: Instance
  textInstance: void
  suspenseInstance: Instance
  hydratableInstance: never
  formInstance: never
  publicInstance: Instance['object']
  hostContext: {}
  childSet: never
  timeoutHandle: number | undefined
  noTimeout: -1
  TransitionStatus: null
}
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}
