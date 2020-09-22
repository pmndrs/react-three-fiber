/**
 * Allows using a TS v4 labeled tuple even with older typescript versions
 */
export type NamedArrayTuple<T extends (...args: any) => any> = Parameters<T>
