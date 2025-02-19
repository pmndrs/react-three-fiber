export type CreateCanvasParameters = {
  beforeReturn?: (canvas: HTMLCanvasElement) => void
  width?: number
  height?: number
}

export interface Obj {
  [key: string]: any
}

/**
 * this is an empty object of any,
 * the data is passed to a new event
 * and subsequently passed to the
 * event handler you're calling
 */
export type MockEventData = {
  [key: string]: any
}

export interface TestInstanceChildOpts {
  exhaustive: boolean
}
