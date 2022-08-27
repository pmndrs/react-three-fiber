import * as React from 'react'
import { DiscreteEventPriority, ContinuousEventPriority, DefaultEventPriority } from 'react-reconciler/constants'
import { useIsomorphicLayoutEffect } from './hooks'

export type SetBlock = false | Promise<null> | null
export type UnblockProps = { set: React.Dispatch<React.SetStateAction<SetBlock>>; children: React.ReactNode }

export function Block({ set }: Omit<UnblockProps, 'children'>) {
  useIsomorphicLayoutEffect(() => {
    set(new Promise(() => null))
    return () => set(false)
  }, [set])
  return null
}

export class ErrorBoundary extends React.Component<
  { set: React.Dispatch<Error | undefined>; children: React.ReactNode },
  { error: boolean }
> {
  state = { error: false }
  static getDerivedStateFromError = () => ({ error: true })
  componentDidCatch(err: Error) {
    this.props.set(err)
  }
  render() {
    return this.state.error ? null : this.props.children
  }
}

// https://github.com/facebook/react/tree/main/packages/react-reconciler#getcurrenteventpriority
// Gives React a clue as to how import the current interaction is
export function getEventPriority() {
  let name = window?.event?.type
  switch (name) {
    case 'click':
    case 'contextmenu':
    case 'dblclick':
    case 'pointercancel':
    case 'pointerdown':
    case 'pointerup':
      return DiscreteEventPriority
    case 'pointermove':
    case 'pointerout':
    case 'pointerover':
    case 'pointerenter':
    case 'pointerleave':
    case 'wheel':
      return ContinuousEventPriority
    default:
      return DefaultEventPriority
  }
}
