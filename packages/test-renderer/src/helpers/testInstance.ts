import type { ReactThreeTestInstance } from '../createTestInstance'
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

interface FindAllOptions {
  /**
   * Whether to include the root node in search results.
   * When false, only searches within children.
   * @default true
   */
  includeRoot?: boolean
}

export const findAll = (
  root: ReactThreeTestInstance,
  decider: (node: ReactThreeTestInstance) => boolean,
  options: FindAllOptions = { includeRoot: true },
) => {
  const results = []

  // Only include the root node if the option is enabled
  if (options.includeRoot !== false && decider(root)) {
    results.push(root)
  }

  // Always search through children
  root.allChildren.forEach((child) => {
    // When recursively searching children, we always want to include their roots
    results.push(...findAll(child, decider, { includeRoot: true }))
  })

  return results
}
