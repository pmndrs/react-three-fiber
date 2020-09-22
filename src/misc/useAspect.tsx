import { useThree } from 'react-three-fiber'

export function useAspect(type: string, width: number, height: number, factor: number = 1) {
  const { viewport: v, aspect } = useThree()
  const adaptedHeight = height * (aspect > width / height ? v.width / width : v.height / height)
  const adaptedWidth = width * (aspect > width / height ? v.width / width : v.height / height)
  return [adaptedWidth * factor, adaptedHeight * factor, 1]
}
