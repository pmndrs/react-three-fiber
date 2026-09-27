import { createStore } from 'zustand/vanilla'
import { Texture } from 'three'

// Imported through the public webgpu entry on purpose: the helpers live in src/core/utils/textures.ts
// but are only exposed from /webgpu, and this pins that export.
import { createTextureOperations } from '../src/webgpu'
import type { RootState } from '#types'

function setup() {
  const store = createStore<Pick<RootState, 'textures'>>(() => ({ textures: new Map() }))
  const ops = createTextureOperations(store.setState as any)
  return { store, ops }
}

describe('createTextureOperations', () => {
  it('adds and removes single entries', () => {
    const { store, ops } = setup()
    const a = new Texture()

    ops.add('a.png', a)
    expect(store.getState().textures.get('a.png')).toBe(a)

    ops.remove('a.png')
    expect(store.getState().textures.has('a.png')).toBe(false)
  })

  it('adds multiple entries from a Map or a record, and removes several at once', () => {
    const { store, ops } = setup()
    const [a, b, c] = [new Texture(), new Texture(), new Texture()]

    ops.addMultiple(new Map([['a', a]]))
    ops.addMultiple({ b, c })
    expect([...store.getState().textures.keys()]).toEqual(['a', 'b', 'c'])

    ops.removeMultiple(['a', 'c'])
    expect([...store.getState().textures.keys()]).toEqual(['b'])
  })

  it('replaces the Map on every write so subscribers see a new reference', () => {
    const { store, ops } = setup()
    const before = store.getState().textures

    ops.add('a', new Texture())
    expect(store.getState().textures).not.toBe(before)
  })
})
