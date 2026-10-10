import rule from '../../src/rules/no-clone-in-loop'
import { tester } from '../tester'

tester.run('no-clone-in-loop', rule, {
  valid: [
    `
    const vec = new THREE.Vector3()

    useFrame(() => {
      ref.current.position.copy(vec)
    })
  `,
    `
    useFrame(() => {
      clone()
    })
  `,
    `
    useFrame(() => {
      const clone = vec.copy();
    })
  `,
    // A loop variable named `clone` is not a clone() call
    `
    useFrame(() => {
      for (const clone of clones) {
        clone.position.set(0, 0, 0)
      }
    })
  `,
    `
    useFrame(() => {
      clones.forEach((clone) => clone.position.copy(vec))
    })
  `,
  ],
  invalid: [
    {
      code: `
        useFrame(() => {
          ref.current.position.clone()
        })
      `,
      errors: [{ messageId: 'noClone' }],
    },
    {
      code: `
        useFrame(() => {
          positions.forEach((position) => position.clone())
        })
      `,
      errors: [{ messageId: 'noClone' }],
    },
  ],
})
