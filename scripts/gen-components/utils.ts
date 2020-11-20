export const isNotNull = <T>(input: T | null): input is T => input !== null
export const toCamelCase = (input: string) => `${input.charAt(0).toLowerCase()}${input.slice(1)}`
