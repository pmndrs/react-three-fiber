import { Object3D } from 'three'
import React, { useEffect } from 'react'
import { useThree, useFrame } from 'react-three-fiber'

type Helper = Object3D & {
  update: () => void
}

export function useHelper<T>(object3D: React.MutableRefObject<Object3D | undefined>, proto: T, ...args: any[]) {
  const helper = React.useRef<Helper>()

  const { scene } = useThree()
  useEffect(() => {
    if (proto && object3D.current) {
      helper.current = new (proto as any)(object3D.current, ...args)
      if (helper.current) {
        scene.add(helper.current)
      }
    }

    return () => {
      if (helper.current) {
        scene.remove(helper.current)
      }
    }
  }, [scene, proto, object3D, args])

  useFrame(() => {
    if (helper.current) {
      helper.current.update()
    }
  })

  return helper
}
