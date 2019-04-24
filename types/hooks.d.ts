/// <reference types="react" />
export declare function useRender(fn: Function, takeOverRenderloop: boolean): any
export declare function useThree(): {
  ready: boolean
  subscribers: any[]
  manual: boolean
  active: boolean
  canvas: any
  gl: any
  camera: any
  scene: any
  size: any
  canvasRect: any
  frames: number
  aspect: number
  viewport: any
  captured: any
  invalidateFrameloop: boolean
  setManual: (takeOverRenderloop: any) => void
  setDefaultCamera: (cam: any) => void
  invalidate: () => void
}
export declare function useUpdate(
  callback: Function,
  dependents: [],
  optionalRef: React.MutableRefObject<any>
): React.MutableRefObject<any>
export declare function useResource(optionalRef: React.MutableRefObject<any>): React.MutableRefObject<any>
