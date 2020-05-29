import { useThree } from 'react-three-fiber'

export function useAspect(width: number, height: number, type?: string) {
  const { viewport: v, aspect } = useThree()
  const adaptedHeight = v.height * (aspect > v.width / v.height ? width / v.width : height / v.height)
  const adaptedWidth = v.width * (aspect > v.width / v.height ? width / v.width : height / v.height)
  return [adaptedHeight, adaptedWidth, 1]
}
