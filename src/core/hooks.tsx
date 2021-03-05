import * as React from 'react'
import { StateSelector, EqualityChecker } from 'zustand'
import { context, RootState } from './store'

export function useThree(selector: StateSelector<RootState, void>, equalityFn?: EqualityChecker<void>) {
  return React.useContext(context)(selector, equalityFn)
}
