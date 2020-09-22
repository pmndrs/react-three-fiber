import { BloomEffect, BlendFunction } from 'postprocessing'
import { wrapEffect } from '../util'

export const Bloom = wrapEffect(BloomEffect, BlendFunction.SCREEN)
