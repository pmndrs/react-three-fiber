import { AudioLoader, AudioListener, PositionalAudio as PositionalAudioImpl } from 'three'
import React, { forwardRef, useRef, useState, useEffect } from 'react'
import { useThree, useLoader } from 'react-three-fiber'
// @ts-ignore
import mergeRefs from 'react-merge-refs'

type Props = JSX.IntrinsicElements['positionalAudio'] & {
  url: string
  distance: number
  loop: boolean
}

export const PositionalAudio = forwardRef(({ url, distance = 1, loop = true, ...props }: Props, ref) => {
  const sound = useRef<PositionalAudioImpl>()
  const { camera } = useThree()
  const [listener] = useState(() => new AudioListener())
  const buffer = useLoader(AudioLoader, url)
  useEffect(() => {
    sound.current?.setBuffer(buffer)
    sound.current?.setRefDistance(distance)
    sound.current?.setLoop(loop)
    sound.current?.play()
    camera.add(listener)
    return () => void camera.remove(listener)
  }, [])
  return <positionalAudio ref={mergeRefs([sound, ref])} args={[listener]} {...props} />
})
