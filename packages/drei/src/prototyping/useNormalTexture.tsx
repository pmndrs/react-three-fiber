import { useEffect, useMemo } from 'react'
import { useTextureLoader } from '../loaders/useTextureLoader'
import { RepeatWrapping, Texture, Vector2 } from 'three'
import normalsList from './normal-assets.json'

const NORMAL_ROOT = 'https://rawcdn.githack.com/emmelleppi/normal-maps/f24c810fc1d86b5b1e5dfea914b668f70b5f2923'
const DEFAULT_NORMAL = normalsList[0]

export function useNormalTexture(id = 0, { repeat = [1, 1], anisotropy = 1, offset = [0, 0] }) {
  const numTot = useMemo(() => Object.keys(normalsList).length, [])

  const imageName = normalsList[id] || DEFAULT_NORMAL
  const url = `${NORMAL_ROOT}/normals/${imageName}`

  // @ts-expect-error
  const normalTexture: Texture = useTextureLoader(url)

  useEffect(() => {
    if (!normalTexture) return
    normalTexture.wrapS = normalTexture.wrapT = RepeatWrapping
    normalTexture.repeat = new Vector2(repeat[0], repeat[1])
    normalTexture.offset = new Vector2(offset[0], offset[1])
    normalTexture.anisotropy = anisotropy
  }, [normalTexture, anisotropy, repeat, offset])

  return [normalTexture, url, numTot]
}
