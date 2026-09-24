import type { TrackedPromise } from './promise'

export type RootStateMachine =
  | { status: 'open' }
  | { status: 'closing'; token: symbol; effectsFlushed: boolean }
  | { status: 'disposing' }
  | { status: 'disposed' }

type RootEvent =
  | { type: 'use' }
  | { type: 'unmount'; token: symbol }
  | { type: 'effects-flushed'; token: symbol }
  | { type: 'dispose'; token: symbol }
  | { type: 'disposed' }

/**
 * open -> closing -> disposing -> disposed
 *          | use
 *          v
 *         open
 *
 * Only closing can be cancelled. Renderer readiness is independent of lifetime:
 * accepted configuration may finish while closing, but disposal must wait for it.
 */
export function transitionRoot(
  root: { state: RootStateMachine; ready: TrackedPromise<unknown> },
  event: RootEvent,
): boolean {
  const state = root.state
  switch (event.type) {
    case 'use':
      if (state.status !== 'open' && state.status !== 'closing') return false
      root.state = { status: 'open' }
      return true
    case 'unmount':
      if (state.status !== 'open' && state.status !== 'closing') return false
      root.state = { status: 'closing', token: event.token, effectsFlushed: false }
      return true
    case 'effects-flushed':
      if (state.status !== 'closing' || state.token !== event.token) return false
      root.state = { ...state, effectsFlushed: true }
      return true
    case 'dispose':
      if (
        state.status !== 'closing' ||
        state.token !== event.token ||
        !state.effectsFlushed ||
        root.ready.status === 'pending'
      ) {
        return false
      }
      root.state = { status: 'disposing' }
      return true
    case 'disposed':
      if (state.status !== 'disposing') return false
      root.state = { status: 'disposed' }
      return true
  }
}
