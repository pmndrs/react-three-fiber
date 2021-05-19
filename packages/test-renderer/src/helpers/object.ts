export const invert = <T extends string | number | symbol>(obj: Record<string, T>) => {
  return Object.entries<T>(obj).reduce((inverted, [key, val]) => {
    inverted[val] = key
    return inverted
  }, {} as Record<T, string>)
}
