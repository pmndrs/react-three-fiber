/**
 * @fileoverview configureTSL — the runtime half of `Register`.
 *
 * Registration types uniforms as always present; configureTSL makes that true by creating them on
 * every primary canvas's RootState: canvases mounted afterwards, and ones already mounted. Secondary
 * canvases see them through their primary.
 *
 * The configuration is global, so every test uses its own names.
 */
import * as React from 'react'
import { act } from 'react'
import { Color } from 'three/webgpu'
import { useThree } from '@react-three/fiber'
import type { RootState } from '@react-three/fiber'
import { configureTSL, useUniforms } from '../src'
import { mountPrimary, mountSecondary, setupRealRoots } from './roots'

setupRealRoots('configure-tsl')

const uniformsOf = (state: RootState) => state.uniforms as Record<string, any>

describe('configureTSL', () => {
  it('creates the configured uniforms on canvases mounted afterwards, before any hook runs', async () => {
    configureTSL({ uniforms: { uCfgLaterTime: 0, uCfgLaterColor: new Color('red') } })

    let seenOnFirstRender: unknown
    const Reader = () => {
      seenOnFirstRender ??= useThree((s) => s.uniforms as Record<string, any>).uCfgLaterTime
      return null
    }
    const { store } = await mountPrimary(<Reader />)
    const uniforms = uniformsOf(store.getState())
    expect(uniforms.uCfgLaterTime.value).toBe(0)
    expect(uniforms.uCfgLaterColor.value).toBeInstanceOf(Color)
    expect(seenOnFirstRender).toBe(uniforms.uCfgLaterTime)
  })

  it('creates them on canvases already mounted, and their secondaries see them', async () => {
    const { store, id } = await mountPrimary(<group />)
    const secondary = await mountSecondary(id, <group />)

    await act(async () => configureTSL({ uniforms: { uCfgEarly: 1 } }))

    expect(uniformsOf(store.getState()).uCfgEarly.value).toBe(1)
    expect(uniformsOf(secondary.store.getState()).uCfgEarly).toBe(uniformsOf(store.getState()).uCfgEarly)
  })

  it('creates scoped uniforms under their scope', async () => {
    configureTSL({ scopes: { cfgPlayer: { uCfgHealth: 100 } } })

    const { store } = await mountPrimary(<group />)
    const uniforms = uniformsOf(store.getState())
    expect(uniforms.cfgPlayer.uCfgHealth.value).toBe(100)
    expect(uniforms.uCfgHealth).toBeUndefined()
  })

  it('hands the configured node to a hook that declares the same name, instead of replacing it', async () => {
    configureTSL({ uniforms: { uCfgShared: 3 } })

    let fromHook: unknown
    const Comp = () => {
      fromHook = useUniforms({ uCfgShared: 3 }).uCfgShared
      return null
    }
    const { store } = await mountPrimary(<Comp />)
    const configured = uniformsOf(store.getState()).uCfgShared

    expect(configured).toBeDefined()
    expect(fromHook).toBe(configured)
  })

  it('never replaces a uniform that already exists when configured again', async () => {
    configureTSL({ uniforms: { uCfgOnce: 1 } })
    const { store } = await mountPrimary(<group />)
    const first = uniformsOf(store.getState()).uCfgOnce

    await act(async () => configureTSL({ uniforms: { uCfgOnce: 2 } }))

    const after = uniformsOf(store.getState()).uCfgOnce
    expect(after).toBe(first)
    expect(after.value).toBe(1)
  })

  it('keeps earlier configuration when called again with other keys', async () => {
    configureTSL({ uniforms: { uCfgA: 1 } })
    configureTSL({ uniforms: { uCfgB: 2 } })

    const { store } = await mountPrimary(<group />)
    const uniforms = uniformsOf(store.getState())
    expect(uniforms.uCfgA.value).toBe(1)
    expect(uniforms.uCfgB.value).toBe(2)
  })

  it('stops applying to a canvas after it unmounts', async () => {
    const { root, store } = await mountPrimary(<group />)
    await act(async () => root.unmount())

    await act(async () => configureTSL({ uniforms: { uCfgAfterUnmount: 1 } }))
    expect(uniformsOf(store.getState()).uCfgAfterUnmount).toBeUndefined()
  })
})
