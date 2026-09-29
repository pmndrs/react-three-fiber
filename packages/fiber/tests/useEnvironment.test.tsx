import { vi } from 'vitest'
import { useEnvironment, useLoader } from '../src'

describe('useEnvironment', () => {
  it('clears a preload while its decoder import is pending', async () => {
    const calls: string[] = []
    const preload = vi.spyOn(useLoader, 'preload').mockImplementation(() => {
      calls.push('preload')
    })
    const clear = vi.spyOn(useLoader, 'clear').mockImplementation(() => {
      calls.push('clear')
    })

    try {
      useEnvironment.preload({ files: 'clear-race.exr' })
      useEnvironment.clear({ files: 'clear-race.exr' })

      await vi.waitFor(() => expect(clear).toHaveBeenCalledTimes(1))
      expect(calls).toEqual(['preload', 'clear'])
      expect(clear.mock.calls[0][0]).toBe(preload.mock.calls[0][0])
      expect(clear.mock.calls[0][1]).toBe('clear-race.exr')
    } finally {
      preload.mockRestore()
      clear.mockRestore()
    }
  })
})
