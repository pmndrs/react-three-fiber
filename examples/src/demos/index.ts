import React, { lazy } from 'react'

type Example = {
  descr: string
  tags: string[]
  bright: boolean
  Component: React.LazyExoticComponent<() => JSX.Element>
}

const examples: Record<string, Example> = {
  TakeControl: { descr: '', tags: [], bright: false, Component: lazy(async () => await import('./TakeControl')) },
  Bubbles: { descr: '', tags: [], bright: false, Component: lazy(async () => await import('./Bubbles')) },
  Selection: { descr: '', tags: [], bright: false, Component: lazy(async () => await import('./Selection')) },
}

export default examples
