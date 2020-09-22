import type { Object3D } from 'three'
import type { WorkerCollideEvent, WorkerRayhitEvent } from './Provider'
import type { AtomicProps } from './hooks'
import React, { Suspense, createContext, lazy } from 'react'
import { ProviderProps } from './Provider'
export * from './hooks'

export type Buffers = { positions: Float32Array; quaternions: Float32Array }
export type Refs = { [uuid: string]: Object3D }
export type Event =
  | (Omit<WorkerRayhitEvent['data'], 'body'> & { body: Object3D | null })
  | (Omit<WorkerCollideEvent['data'], 'body' | 'target'> & { body: Object3D; target: Object3D })
export type Events = { [uuid: string]: (e: Event) => void }
export type Subscriptions = {
  [id: string]: (value: AtomicProps[keyof AtomicProps] | number[]) => void
}

export type ProviderContext = {
  worker: Worker
  bodies: React.MutableRefObject<{ [uuid: string]: number }>
  buffers: Buffers
  refs: Refs
  events: Events
  subscriptions: Subscriptions
}

const context = createContext<ProviderContext>({} as ProviderContext)
const Provider = typeof window === 'undefined' ? () => null : lazy(() => import('./Provider'))

function Physics(props: ProviderProps) {
  return (
    <Suspense fallback={null}>
      <Provider {...props} />
    </Suspense>
  )
}

export { Physics, context }
