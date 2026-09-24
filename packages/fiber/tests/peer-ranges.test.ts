/**
 * @fileoverview The workspace packages that peer on React must state the same supported range,
 * otherwise installing @react-three/test-renderer next to a supported React fails peer resolution.
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'

const readManifest = (name: string) =>
  JSON.parse(fs.readFileSync(path.resolve(__dirname, '../..', name, 'package.json'), 'utf-8'))

describe('peer ranges', () => {
  it('test-renderer accepts every React version fiber accepts', () => {
    const fiber = readManifest('fiber')
    const testRenderer = readManifest('test-renderer')
    expect(testRenderer.peerDependencies.react).toBe(fiber.peerDependencies.react)
    expect(fiber.peerDependencies['react-dom']).toBe(fiber.peerDependencies.react)
  })
})
