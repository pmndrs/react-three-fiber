import { useMemo } from 'react'
import { useTextureLoader } from '../loaders/useTextureLoader'
import matcapList from './matcap-assets.json'

function getFormatString(format: number) {
  switch (format) {
    case 64:
      return '-64px'
    case 128:
      return '-128px'
    case 256:
      return '-256px'
    case 512:
      return '-512px'
    default:
      return ''
  }
}

const MATCAP_ROOT = 'https://rawcdn.githack.com/emmelleppi/matcaps/9b36ccaaf0a24881a39062d05566c9e92be4aa0d'
const DEFAULT_MATCAP = matcapList[0]

export function useMatcapTexture(id: number | string = 0, format = 1024) {
  const numTot = useMemo(() => Object.keys(matcapList).length, [])

  const fileHash = useMemo(() => {
    if (typeof id === 'string') {
      return id
    } else if (typeof id === 'number') {
      return matcapList[id]
    }
    return null
  }, [id])

  const fileName = `${fileHash || DEFAULT_MATCAP}${getFormatString(format)}.png`
  const url = `${MATCAP_ROOT}/${format}/${fileName}`

  const matcapTexture = useTextureLoader(url)

  return [matcapTexture, url, numTot]
}
