import { RuleTester } from 'eslint'
import rule from '../../src/rules/no-new-in-loop'

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
    const vec = new THREE.Vector3()

    useFrame(() => {
      ref.current.position.lerp(vec.set(x, y, z), 0.1)
    })
  `,
    `
    const vec = new Vector3()

    useFrame(() => {
      ref.current.position.copy(vec)
    })
  `,
    `
    const vec = new Vector3()

    useFrame(() => {
      ref.current.position.lerp(vec.set(x, y, z), 0.1)
    })
  `,
  ],
  invalid: [
    {
      code: `
        useFrame(() => {
          ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1)
        })
      `,
      errors: [{ messageId: 'noNew' }],
    },
    {
      code: `
        useFrame(() => {
          ref.current.position.lerp(new Vector3(x, y, z), 0.1)
        })
      `,
      errors: [{ messageId: 'noNew' }],
    },
  ],
})
