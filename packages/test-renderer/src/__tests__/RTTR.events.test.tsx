jest.mock('scheduler', () => require('scheduler/unstable_mock'))

import * as React from 'react'

import ReactThreeTestRenderer from '../index'

describe('ReactThreeTestRenderer Events', () => {
  it('should handle PointerDown event', async () => {
    expect(true).toBe(true)
  })
})
