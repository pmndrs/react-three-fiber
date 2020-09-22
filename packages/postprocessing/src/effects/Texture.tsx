import { TextureEffect } from 'postprocessing'
import React, { Ref, ForwardRefExoticComponent, forwardRef, useMemo, useLayoutEffect } from 'react'
import { useLoader } from 'react-three-fiber'
import { TextureLoader, sRGBEncoding, RepeatWrapping } from 'three'

type TextureProps = ConstructorParameters<typeof TextureEffect>[0] & {
  textureSrc: string
}

export const Texture: ForwardRefExoticComponent<TextureProps> = forwardRef(function Texture(
  { textureSrc, texture, ...props }: TextureProps,
  ref: Ref<TextureEffect>
) {
  const t = useLoader(TextureLoader, textureSrc)
  useLayoutEffect(() => {
    t.encoding = sRGBEncoding
    t.wrapS = t.wrapT = RepeatWrapping
  }, [t])
  const effect = useMemo(() => new TextureEffect({ ...props, texture: t || texture }), [props, t, texture])
  return <primitive ref={ref} object={effect} dispose={null} />
})
