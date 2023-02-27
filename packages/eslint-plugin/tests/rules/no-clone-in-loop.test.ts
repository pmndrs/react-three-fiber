import { RuleTester } from 'eslint'
import rule from '../../src/rules/no-clone-in-loop'

const tester = new RuleTester({
  parserOptions: { ecmaVersion: 2015 },
})

tester.run('no-new-in-loop', rule, {
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
  ],
})
