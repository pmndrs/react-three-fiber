export const lowerCaseFirstLetter = (str: string) => `${str.charAt(0).toLowerCase()}${str.slice(1)}`

export const toEventHandlerName = (eventName: string) => `on${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`
