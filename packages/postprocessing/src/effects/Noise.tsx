import { NoiseEffect, BlendFunction } from 'postprocessing'
import { wrapEffect } from '../util'

export const Noise = wrapEffect(NoiseEffect, BlendFunction.COLOR_DODGE)
