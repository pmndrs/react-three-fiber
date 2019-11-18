export * from './generated'
export * from './types'

export type PrimitiveProps<T> = { object: T } & Partial<T>
export const Primitive = ('primitive' as any) as <T extends unknown>(props: PrimitiveProps<T>) => JSX.Element

export type NewProps<T extends new (...args: any[]) => unknown> = Partial<InstanceType<T>> & {
  object: T
  args: ConstructorParameters<T>
}

export const New = ('new' as any) as <T extends new (...args: any[]) => unknown>(props: NewProps<T>) => JSX.Element
