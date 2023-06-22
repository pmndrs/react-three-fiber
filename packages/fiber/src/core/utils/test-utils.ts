import React from 'react'

export type Act = <T = any>(cb: () => Promise<T>) => Promise<T>

/**
 * Safely flush async effects when testing, simulating a legacy root.
 */
export const act: Act = (React as any).unstable_act
