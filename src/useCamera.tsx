import { Raycaster, Camera, Intersection } from 'three'
import React, { useState } from 'react'
import { useThree, applyProps } from 'react-three-fiber'

export function useCamera(camera: Camera | React.MutableRefObject<Camera>, props?: Partial<Raycaster>) {
  const { mouse } = useThree()
  const [raycast] = useState(() => {
    let raycaster = new Raycaster()
    if (props) applyProps(raycaster, props, {})
    return function (_: Raycaster, intersects: Intersection[]): void {
      raycaster.setFromCamera(mouse, camera instanceof Camera ? camera : camera.current)
      const rc = this.constructor.prototype.raycast.bind(this)
      if (rc) rc(raycaster, intersects)
    }
  })
  return raycast
}
