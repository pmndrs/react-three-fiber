import React from 'react'
import { render } from './reconciler'
import { Group } from 'three'

describe('reconciler', () => {
  test('should produce idempotent sibling nodes movement', () => {
    const rootGroup = new Group()

    render(
      <>
        <group key="a" />
        <group key="b" />
        <group key="c" />
      </>,
      rootGroup
    )

    // Should  move 'b' node before 'a' one with insertBefore
    render(
      <>
        <group key="b" />
        <group key="a" />
        <group key="c" />
      </>,
      rootGroup
    )

    expect(rootGroup.children.length).toBe(3)
  })
})
