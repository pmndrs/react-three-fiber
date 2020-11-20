export * from './types'
import { PrimitiveProps, NewProps } from './types'

export const Primitive = ('primitive' as any) as <T extends unknown>(props: PrimitiveProps<T>) => JSX.Element
export const New = ('new' as any) as <T extends new (...args: any[]) => unknown>(props: NewProps<T>) => JSX.Element
