/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable react-hooks/exhaustive-deps */
import React from 'react'

// we need to use a cache to store the values between renders
// otherwise, the context value changes will not propagate since
// it cannot pierce the React.useMemo
const cache = {}

// context bridge caches must be unique. This creates a simple mechanism
// to ensure that each time a `useContextBridge` is used, a unique key is used
let uid = 0
function getNextId() {
  while (!!cache[`_${uid}`]) uid++
  return `_${uid}`
}

export function useContextBridge(...contexts: Array<React.Context<any>>) {
  const cacheKeyRef = React.useRef(getNextId())

  // evaluate each context and cache its value above so that we can pierce
  // the useMemo below and cause a rerender.
  cache[cacheKeyRef.current] = contexts.map((context) => React.useContext(context))

  // cleanup the cache on unmount
  React.useEffect(() => () => void delete cache[cacheKeyRef.current], [])

  // create a tree of context providers that are parented to each other.
  // the order follows from left => right in the array of contexts passed in
  // where the left-most is the root parent created.
  // Note: The dependency array is intentionally left blank to prevent remounting.
  // A single rerender will still occur due to the nature of how react context is discovered
  return React.useMemo(
    () => ({ children }: { children: React.ReactElement<any> }) =>
      contexts.reduceRight(
        (acc, Context, i) => <Context.Provider value={cache[cacheKeyRef.current][i]} children={acc} />,
        children
      ),
    []
  )
}
