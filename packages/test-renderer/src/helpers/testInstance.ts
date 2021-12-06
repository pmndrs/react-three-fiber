import { ReactThreeTestInstance } from '../createTestInstance'
import type { Obj } from '../types/internal'

export const expectOne = <TItem>(items: TItem[], msg: string) => {
  if (items.length === 1) {
    return items[0]
  }

  const prefix =
    items.length === 0 ? 'RTTR: No instances found' : `RTTR: Expected 1 but found ${items.length} instances`

  throw new Error(`${prefix} ${msg}`)
}

export const matchProps = (props: Obj, filter: Obj) => {
  for (const key in filter) {
    // Check for matches if filter contains regex matchers
    const isRegex = filter[key] instanceof RegExp
    const shouldMatch = isRegex && typeof props[key] === 'string'
    const match = shouldMatch && filter[key].test(props[key])

    // Bail if props aren't identical and filters found no match
    if (props[key] !== filter[key] && !match) {
      return false
    }
  }

  return true
}

export const findAll = (root: ReactThreeTestInstance, decider: (node: ReactThreeTestInstance) => boolean) => {
  const results = []

  if (decider(root)) {
    results.push(root)
  }

  root.allChildren.forEach((child) => {
    results.push(...findAll(child, decider))
  })

  return results
}
