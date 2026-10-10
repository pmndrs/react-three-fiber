import * as THREE from 'three'
import { parseBackground } from '../src/core/utils/parseBackground'

describe('parseBackground', () => {
  it('returns null when no background is set', () => {
    expect(parseBackground(undefined)).toBeNull()
    expect(parseBackground('')).toBeNull()
  })

  describe('colors', () => {
    it('treats CSS color names as colors', () => {
      expect(parseBackground('red')).toEqual({ color: 'red', background: true })
    })

    it('treats hex strings as colors', () => {
      expect(parseBackground('#ff0000')).toEqual({ color: '#ff0000', background: true })
    })

    it('treats hex numbers as colors', () => {
      expect(parseBackground(0x00ff00)).toEqual({ color: 0x00ff00, background: true })
    })

    it('treats 0 as black rather than unset', () => {
      expect(parseBackground(0)).toEqual({ color: 0, background: true })
    })

    it('treats THREE.Color instances as colors', () => {
      const color = new THREE.Color('blue')
      expect(parseBackground(color as any)).toEqual({ color, background: true })
    })
  })

  describe('presets', () => {
    it('treats known preset names as presets', () => {
      expect(parseBackground('city')).toEqual({ preset: 'city', background: true })
    })
  })

  describe('files / URLs', () => {
    // Regression for Bug #3: the extension branch used `\\.` (escaped backslash)
    // instead of `\.`, so bare filenames fell through and were mis-parsed as colors.
    it.each(['sky.hdr', 'sky.exr', 'sky.jpg', 'sky.jpeg', 'sky.png', 'sky.webp', 'sky.avif', 'sky.gif'])(
      'treats bare filename %s as a file',
      (file) => {
        expect(parseBackground(file)).toEqual({ files: file, background: true })
      },
    )

    it.each(['./sky.jpg', '../sky.jpg', '/env.hdr', 'https://example.com/env.hdr', 'http://example.com/x.png'])(
      'treats prefixed path/URL %s as a file',
      (url) => {
        expect(parseBackground(url)).toEqual({ files: url, background: true })
      },
    )

    it.each(['sky.png?v=2', 'sky.hdr#rev', 'SKY.JPG?w=2048&q=80'])('treats %s (query or hash) as a file', (file) => {
      expect(parseBackground(file)).toEqual({ files: file, background: true })
    })

    it.each([
      'data:image/png;base64,iVBORw0KGgo=',
      'data:image/jpeg;base64,/9j/4AAQ',
      'data:application/hdr;base64,Iz8=',
    ])('treats data URL %s as a file', (url) => {
      expect(parseBackground(url)).toEqual({ files: url, background: true })
    })
  })

  describe('object form', () => {
    it('maps envMap/backgroundMap into Environment props', () => {
      expect(
        parseBackground({
          backgroundMap: 'sky.jpg',
          envMap: 'env.hdr',
          backgroundBlurriness: 0.5,
        } as any),
      ).toEqual({
        preset: undefined,
        files: 'env.hdr',
        backgroundFiles: 'sky.jpg',
        backgroundBlurriness: 0.5,
        background: true,
      })
    })
  })
})
