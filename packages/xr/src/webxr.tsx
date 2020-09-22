// Types that should eventually land in lib.dom.d.ts
// Taken from WebXR spec
// https://www.w3.org/TR/webxr/

export type XRHandedness = 'none' | 'left' | 'right'

export type XRTargetRayMode = 'gaze' | 'tracked-pointer' | 'screen'

export type XRSpace = EventTarget

export interface XRInputSource {
  readonly handedness: XRHandedness
  readonly targetRayMode: XRTargetRayMode
  readonly gamepad?: Gamepad
  readonly targetRaySpace: XRSpace
  readonly gripSpace?: XRSpace
  readonly profiles: string
}
