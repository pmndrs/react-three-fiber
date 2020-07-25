import { Texture, TextureLoader } from 'three'
import { useLoader } from 'react-three-fiber'

export function useTextureLoader(url: string extends any[] ? string[] : string): Texture | Texture[] {
  return useLoader(TextureLoader, url)
}
