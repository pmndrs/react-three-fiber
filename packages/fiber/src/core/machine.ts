export type RootStateMachine = { status: 'open' } | { status: 'closing'; token: symbol } | { status: 'disposed' }

type RootEvent = { type: 'use' } | { type: 'unmount'; token: symbol } | { type: 'dispose'; token: symbol }

/**
 * open -> closing -> disposed
 *          | use
 *          v
 *         open
 *
 * Only closing can be cancelled. Each unmount carries a token, so only the latest one can dispose.
 */
export function transitionRoot(root: { state: RootStateMachine }, event: RootEvent): boolean {
  const state = root.state
  switch (event.type) {
    case 'use':
      if (state.status === 'disposed') return false
      root.state = { status: 'open' }
      return true
    case 'unmount':
      if (state.status === 'disposed') return false
      root.state = { status: 'closing', token: event.token }
      return true
    case 'dispose':
      if (state.status !== 'closing' || state.token !== event.token) return false
      root.state = { status: 'disposed' }
      return true
  }
}
