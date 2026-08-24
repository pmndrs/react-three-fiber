/**
 * @fileoverview Pure-JS unit tests for the Canvas `renderer` config-bag parser.
 *
 * The Canvas `renderer` prop is overloaded — boolean shorthand, a renderer
 * instance/factory, a plain options object, or a "config bag" that also carries
 * multi-canvas (`primaryCanvas`) / `scheduler` metadata. `parseRendererConfig`
 * normalizes it into `{ primaryCanvas, scheduler, renderer }` before it reaches
 * `configure()`. This logic is pure, so it is unit-tested directly here (it is
 * the same helper CanvasImpl calls — see core/Canvas.tsx).
 */
import { describe, expect, it } from 'vitest'
import { parseRendererConfig } from '../src/core/utils/parseRendererConfig'

describe('parseRendererConfig', () => {
  describe('pass-through (not a config bag)', () => {
    it('leaves undefined untouched (default)', () => {
      expect(parseRendererConfig(undefined)).toEqual({
        primaryCanvas: undefined,
        scheduler: undefined,
        renderer: undefined,
      })
    })

    it('leaves boolean true untouched (shorthand: use default WebGPU renderer)', () => {
      expect(parseRendererConfig(true as any)).toEqual({
        primaryCanvas: undefined,
        scheduler: undefined,
        renderer: true,
      })
    })

    it('leaves boolean false untouched', () => {
      expect(parseRendererConfig(false as any)).toEqual({
        primaryCanvas: undefined,
        scheduler: undefined,
        renderer: false,
      })
    })

    it('leaves null untouched (typeof null is object, but the null guard skips it)', () => {
      expect(parseRendererConfig(null as any)).toEqual({
        primaryCanvas: undefined,
        scheduler: undefined,
        renderer: null,
      })
    })

    it('passes a plain options object through unchanged (no primaryCanvas/scheduler keys)', () => {
      const opts = { antialias: true, alpha: false } as any
      const result = parseRendererConfig(opts)
      expect(result.primaryCanvas).toBeUndefined()
      expect(result.scheduler).toBeUndefined()
      expect(result.renderer).toBe(opts)
    })

    it('treats an object with a render method as an instance even if it carries primaryCanvas', () => {
      // The `!('render' in prop)` guard means a real renderer instance is never split.
      const instance = { render() {}, primaryCanvas: 'main' } as any
      const result = parseRendererConfig(instance)
      expect(result.primaryCanvas).toBeUndefined()
      expect(result.scheduler).toBeUndefined()
      expect(result.renderer).toBe(instance)
    })
  })

  describe('config bag (primaryCanvas / scheduler present)', () => {
    it('extracts primaryCanvas; renderer falls back to the original prop when nothing else remains', () => {
      const prop = { primaryCanvas: 'main' } as any
      const result = parseRendererConfig(prop)
      expect(result.primaryCanvas).toBe('main')
      expect(result.scheduler).toBeUndefined()
      // rest is empty → original prop passed through so downstream defaults apply
      expect(result.renderer).toBe(prop)
    })

    it('extracts scheduler; renderer falls back to the original prop when nothing else remains', () => {
      const scheduler = { after: 'main', fps: 30 }
      const prop = { scheduler } as any
      const result = parseRendererConfig(prop)
      expect(result.scheduler).toEqual(scheduler)
      expect(result.primaryCanvas).toBeUndefined()
      expect(result.renderer).toBe(prop)
    })

    it('peels primaryCanvas off and keeps remaining renderer options as the renderer', () => {
      const prop = { primaryCanvas: 'main', antialias: true } as any
      const result = parseRendererConfig(prop)
      expect(result.primaryCanvas).toBe('main')
      expect(result.scheduler).toBeUndefined()
      // renderer is the stripped remainder — must not leak primaryCanvas
      expect(result.renderer).toEqual({ antialias: true })
      expect('primaryCanvas' in (result.renderer as object)).toBe(false)
    })

    it('peels scheduler off and keeps remaining renderer options as the renderer', () => {
      const scheduler = { fps: 60 }
      const prop = { scheduler, alpha: true } as any
      const result = parseRendererConfig(prop)
      expect(result.scheduler).toEqual(scheduler)
      expect(result.renderer).toEqual({ alpha: true })
      expect('scheduler' in (result.renderer as object)).toBe(false)
    })

    it('extracts both primaryCanvas and scheduler, leaving only the renderer options', () => {
      const scheduler = {
        before: ['overlay'],
        after: 'main',
        order: 2,
        fps: 30,
      }
      const prop = { primaryCanvas: 'main', scheduler, antialias: true } as any
      const result = parseRendererConfig(prop)
      expect(result.primaryCanvas).toBe('main')
      expect(result.scheduler).toEqual(scheduler)
      expect(result.renderer).toEqual({ antialias: true })
      expect('primaryCanvas' in (result.renderer as object)).toBe(false)
      expect('scheduler' in (result.renderer as object)).toBe(false)
    })
  })
})
