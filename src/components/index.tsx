export * from './generated'

type PrimitiveProps<T> = { object: T } & Partial<T>
export const Primitive = ('primitive' as any) as <T extends unknown>(props: PrimitiveProps<T>) => JSX.Element
