import { useThree } from 'react-three-fiber'
import { useEffect } from 'react'
// @ts-ignore
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory'

interface HandsProps {
  profile?: 'spheres' | 'boxes' | 'oculus' | 'oculus_lowpoly'
}

export function Hands({ profile = 'oculus' }: HandsProps) {
  const { scene, gl } = useThree()

  useEffect(() => {
    const handFactory = new XRHandModelFactory().setPath('https://threejs.org/examples/models/fbx/')

    const options = profile === 'oculus_lowpoly' ? { model: 'lowpoly' } : undefined
    const threeProfile = profile === 'oculus_lowpoly' ? 'oculus' : profile

    // @ts-ignore
    const hand1 = gl.xr.getHand(0)
    scene.add(hand1)
    hand1.add(handFactory.createHandModel(hand1, threeProfile, options))

    // @ts-ignore
    const hand2 = gl.xr.getHand(1)
    scene.add(hand2)
    hand2.add(handFactory.createHandModel(hand2, threeProfile, options))
  }, [scene, gl])

  return null
}
