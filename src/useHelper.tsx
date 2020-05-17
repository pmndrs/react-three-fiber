import { Object3D } from 'three'
import React, { useEffect } from 'react'
import { useThree, useFrame } from 'react-three-fiber'

type Helper = Object3D & {
  update: () => void
}

// see https://github.com/react-spring/react-three-fiber/blob/master/src/three-types.ts
type Args<T> = T extends new (...args: any) => any ? ConstructorParameters<T> : any[]

type Proto<T> = T extends new (...args: any) => any ? T : any

export function useHelper<T>(object3D: React.MutableRefObject<Object3D | undefined>, proto: Proto<T>, args: Args<T>) {
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
