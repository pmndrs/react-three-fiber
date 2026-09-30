import { RuleTester } from 'eslint'
import rule from '../../src/rules/prefer-local-nodes-deps'

const tester = new RuleTester({
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
})

tester.run('prefer-local-nodes-deps', rule, {
  valid: [
    // An array is passed: whatever it holds, the rule is satisfied
    `
    function Fog() {
      useLocalNodes(({ uniforms }) => ({ fogNode: uniforms.uFog }), [])
    }
  `,
    `
    function Pattern({ pattern }) {
      useLocalNodes(({ nodes }) => ({ result: pattern === 'noise' ? nodes.noise : nodes.stripes }), [pattern])
    }
  `,
    // A creator passed by reference: its identity is the caller's business
    `
    function Fog() {
      useLocalNodes(createFog)
    }
  `,
    // Other hooks are untouched
    `
    function Shared() {
      useNodes(({ uniforms }) => ({ wobble: uniforms.uTime }))
    }
  `,
  ],
  invalid: [
    {
      code: `
    function Fog() {
      useLocalNodes(({ uniforms }) => ({ fogNode: uniforms.uFog }))
    }
  `,
      errors: [
        {
          messageId: 'missingDeps',
          suggestions: [
            {
              messageId: 'addEmptyDeps',
              output: `
    function Fog() {
      useLocalNodes(({ uniforms }) => ({ fogNode: uniforms.uFog }), [])
    }
  `,
            },
          ],
        },
      ],
    },
    {
      // Module constants and globals are not component values
      code: `
    const SCALE = 2
    function Fog() {
      useLocalNodes(function ({ uniforms }) { return { fogNode: uniforms.uFog.mul(SCALE) } })
    }
  `,
      errors: [{ messageId: 'missingDeps' }],
    },
    {
      // A prop read in the creator: steer to a uniform, and offer no [] (it would freeze the prop)
      code: `
    function Tinted({ color, strength }) {
      useLocalNodes(({ uniforms }) => ({ colorNode: mix(uniforms.uBase, color, strength) }))
    }
  `,
      errors: [{ messageId: 'capturesValues', data: { names: '`color`, `strength`' }, suggestions: [] }],
    },
    {
      // State and locals count too, including through a member call
      code: `
    function Panel() {
      const [mode] = useState('a')
      const tsl = { useLocalNodes }
      tsl.useLocalNodes(() => ({ node: mode === 'a' ? a : b }))
    }
  `,
      errors: [{ messageId: 'capturesValues', data: { names: '`mode`' } }],
    },
  ],
})
