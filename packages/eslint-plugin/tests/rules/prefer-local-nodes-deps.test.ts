import rule from '../../src/rules/prefer-local-nodes-deps'
import { tester } from '../tester'

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
    // A creator passed by reference that cannot be resolved in this file
    `
    import { createFog } from './fog'
    function Fog() {
      useLocalNodes(createFog)
    }
  `,
    `
    function Fog() {
      const createFog = useCallback(({ uniforms }) => ({ fogNode: uniforms.uFog }), [])
      useLocalNodes(createFog, [])
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
      errors: [
        {
          messageId: 'missingDeps',
          suggestions: [
            {
              messageId: 'addEmptyDeps',
              output: `
    const SCALE = 2
    function Fog() {
      useLocalNodes(function ({ uniforms }) { return { fogNode: uniforms.uFog.mul(SCALE) } }, [])
    }
  `,
            },
          ],
        },
      ],
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
    {
      // Referenced creators re-run too, even through useCallback
      code: `
    function createFog({ uniforms }) { return { fogNode: uniforms.uFog } }
    function Fog() {
      useLocalNodes(createFog)
    }
  `,
      errors: [
        {
          messageId: 'missingDeps',
          suggestions: [
            {
              messageId: 'addEmptyDeps',
              output: `
    function createFog({ uniforms }) { return { fogNode: uniforms.uFog } }
    function Fog() {
      useLocalNodes(createFog, [])
    }
  `,
            },
          ],
        },
      ],
    },
    {
      code: `
    function Tinted({ color }) {
      const create = useCallback(({ uniforms }) => ({ colorNode: mix(uniforms.uBase, color, 0.5) }), [color])
      useLocalNodes(create)
    }
  `,
      errors: [{ messageId: 'capturesValues', data: { names: '`color`' } }],
    },
  ],
})
