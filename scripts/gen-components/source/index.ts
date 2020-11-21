import * as ReactThreeFiber from './types'

export const Primitive = ('primitive' as any) as <T extends Record<string, any>>(
  props: ReactThreeFiber.PrimitiveProps<T>
) => JSX.Element
export const New = ('new' as any) as <T extends new (...args: any[]) => unknown>(
  props: ReactThreeFiber.NewProps<T>
) => JSX.Element
