import * as React from 'react'

// Local copy of fiber's helper: the package reaches fiber only through the three-free
// @react-three/fiber/extension entry, which does not export utilities.

/** useLayoutEffect in the browser, useEffect where there is no DOM (SSR). */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' && (window.document?.createElement || window.navigator?.product === 'ReactNative')
    ? React.useLayoutEffect
    : React.useEffect
