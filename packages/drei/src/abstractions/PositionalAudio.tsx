import { AudioLoader, AudioListener, PositionalAudio as PositionalAudioImpl } from 'three'
import React, { forwardRef, useRef, useState, useEffect } from 'react'
import { useThree, useLoader } from 'react-three-fiber'
import mergeRefs from 'react-merge-refs'

type Props = JSX.IntrinsicElements['positionalAudio'] & {
  url: string
  distance?: number
  loop?: boolean
}

export const PositionalAudio = forwardRef(({ url, distance = 1, loop = true, ...props }: Props, ref) => {
  const sound = useRef<PositionalAudioImpl>()
  const { camera } = useThree()
  const [listener] = useState(() => new AudioListener())
  const buffer = useLoader(AudioLoader, url)

  useEffect(() => {
    const _sound = sound.current
    if (_sound) {
      _sound.setBuffer(buffer)
      _sound.setRefDistance(distance)
      _sound.setLoop(loop)
      _sound.play()
    }
    camera.add(listener)
    return () => {
      camera.remove(listener)
      if (_sound) {
        _sound.stop()
        _sound.disconnect()
      }
    }
  }, [buffer, camera, distance, listener, loop])
  return <positionalAudio ref={mergeRefs([sound, ref])} args={[listener]} {...props} />
})
