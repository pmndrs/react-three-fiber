import { ReactThreeTestInstance } from '../createTestInstance'
import type { MockInstance, Obj } from '../types/internal'

const INTERNAL_PROPS = [
  // Exclude react-internal props
  'children',
  'key',
  'ref',
  // Exclude "correct" JSX props from breaking snapshots
  // TODO: remove in v9
  // https://github.com/pmndrs/react-three-fiber/pull/2757#issuecomment-1430362907
  'attach',
  'object',
]

export function getMemoizedProps(instance: MockInstance): Record<string, unknown> {
  const props: Record<string, unknown> = {}

  // Gets only instance props from its Fiber
  for (const fiber of [instance.__r3f.fiber, instance.__r3f.fiber?.alternate]) {
    if (fiber) {
      for (const key in fiber.memoizedProps) {
        if (!INTERNAL_PROPS.includes(key)) props[key] ??= fiber.memoizedProps[key]
      }
    }
  }

  props.args ??= []

  return props
}

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
