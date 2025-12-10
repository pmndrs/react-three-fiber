// Migrated from Drei
import { Texture as _Texture, TextureLoader } from '#three'
import { useLoader, useThree } from './'
import { useLayoutEffect, useEffect, useMemo, ReactNode } from 'react'

export const IsObject = (url: unknown): url is Record<string, string> =>
  url === Object(url) && !Array.isArray(url) && typeof url !== 'function'

type TextureArray<T> = T extends string[] ? _Texture[] : never
type TextureRecord<T> = T extends Record<string, string> ? { [key in keyof T]: _Texture } : never
type SingleTexture<T> = T extends string ? _Texture : never

export type MappedTextureType<T extends string[] | string | Record<string, string>> =
  | TextureArray<T>
  | TextureRecord<T>
  | SingleTexture<T>

export function useTexture<Url extends string[] | string | Record<string, string>>(
  input: Url,
  onLoad?: (texture: MappedTextureType<Url>) => void,
): MappedTextureType<Url> {
  const gl = useThree((state) => state.gl)
  const textures = useLoader(TextureLoader, IsObject(input) ? Object.values(input) : input) as MappedTextureType<Url>

  useLayoutEffect(() => {
    onLoad?.(textures)
  }, [onLoad])

  // https://github.com/mrdoob/three.js/issues/22696
  // Upload the texture to the GPU immediately instead of waiting for the first render
  // NOTE: only available for WebGLRenderer
  useEffect(() => {
    if ('initTexture' in gl) {
      let textureArray: _Texture[] = []
      if (Array.isArray(textures)) {
        textureArray = textures
      } else if (textures instanceof _Texture) {
        textureArray = [textures]
      } else if (IsObject(textures)) {
        textureArray = Object.values(textures)
      }

      textureArray.forEach((texture) => {
        if (texture instanceof _Texture) {
          gl.initTexture(texture)
        }
      })
    }
  }, [gl, textures])

  const mappedTextures = useMemo(() => {
    if (IsObject(input)) {
      const keyed = {} as Record<string, _Texture>
      const textureArray = textures as _Texture[]
      let i = 0
      for (const key in input) keyed[key] = textureArray[i++]
      return keyed as TextureRecord<Url>
    } else {
      return textures
    }
  }, [input, textures])

  return mappedTextures
}

useTexture.preload = (url: string | string[]) => useLoader.preload(TextureLoader, url)
useTexture.clear = (input: string | string[]) => useLoader.clear(TextureLoader, input)

//

export const Texture = ({
  children,
  input,
  onLoad,
}: {
  children?: (texture: ReturnType<typeof useTexture>) => ReactNode
  input: Parameters<typeof useTexture>[0]
  onLoad?: Parameters<typeof useTexture>[1]
}) => {
  const ret = useTexture(input, onLoad)

  return <>{children?.(ret)}</>
}
