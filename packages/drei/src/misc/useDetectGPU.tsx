import { useMemo } from 'react'
import { getGPUTier, IGetGPUTier } from 'detect-gpu'

export function useDetectGPU(
  props: IGetGPUTier
): {
  isDesktop: boolean
  isMobile: boolean
  tier: string
  type: string
} {
  const GPUTier = useMemo(() => {
    const GPUTier = getGPUTier(props)

    return {
      isDesktop: GPUTier.tier.indexOf('DESKTOP') > -1,
      isMobile: GPUTier.tier.indexOf('MOBILE') > -1,
      tier: GPUTier.tier.split('_').pop()!,
      type: GPUTier.type,
    }
  }, [props])

  return GPUTier
}
