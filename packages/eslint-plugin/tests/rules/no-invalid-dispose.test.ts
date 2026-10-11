import rule from '../../src/rules/no-invalid-dispose'
import { tester } from '../tester'

tester.run('no-invalid-dispose', rule, {
  valid: [
    `<mesh dispose={null} />`,
    `<mesh />`,
    // A variable may be null at runtime
    `<mesh dispose={keep ? null : undefined} />`,
    // Components handle their own props
    `<Model dispose={false} />`,
  ],
  invalid: [
    {
      code: `<mesh geometry={shared} dispose={false} />`,
      output: `<mesh geometry={shared} dispose={null} />`,
      errors: [{ messageId: 'onlyNull', data: { value: 'false' } }],
    },
    {
      code: `<group dispose />`,
      errors: [{ messageId: 'onlyNull', data: { value: 'true' } }],
    },
    {
      code: `<group dispose={0} />`,
      errors: [{ messageId: 'onlyNull', data: { value: '0' } }],
    },
  ],
})
