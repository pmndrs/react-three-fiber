import rule from '../../src/rules/no-deferred-resource-read'
import { tester } from '../tester'

tester.run('no-deferred-resource-read', rule, {
  valid: [
    // Read in the creator, closed over in Fn
    `
    useLocalNodes(({ uniforms }) => {
      const strength = uniforms.uStrength
      return { effect: Fn(() => strength.mul(2)) }
    }, [])
  `,
    // Reads in the creator itself
    `useLocalNodes(({ uniforms, nodes }) => ({ out: nodes.noise.mul(uniforms.uScale) }), [])`,
    // Other state inside Fn is not a tracked resource
    `useLocalNodes(({ camera }) => ({ effect: Fn(() => camera.position) }), [])`,
    // A nested function that is not an Fn body
    `useLocalNodes(({ uniforms }) => ({ list: keys.map((key) => uniforms[key]) }), [])`,
    // Other hooks do not track reads
    `useNodes(({ uniforms }) => ({ effect: Fn(() => uniforms.uStrength.mul(2)) }))`,
  ],
  invalid: [
    {
      code: `useLocalNodes(({ uniforms }) => ({ effect: Fn(() => uniforms.uStrength.mul(2)) }), [])`,
      errors: [{ messageId: 'deferredRead', data: { key: 'uniforms' } }],
    },
    {
      // A whole-state parameter, and a renamed destructured key
      code: `
        useLocalNodes((state) => ({ a: Fn(() => state.nodes.noise) }), [])
        useLocalNodes(({ textures: t }) => ({ b: Fn(() => texture(t.get('/wood.png'))) }), [])
      `,
      errors: [
        { messageId: 'deferredRead', data: { key: 'nodes' } },
        { messageId: 'deferredRead', data: { key: 'textures' } },
      ],
    },
    {
      // Nested inside the Fn body, and a creator passed by reference
      code: `
        function Glow() {
          const create = ({ buffers }) => ({ glow: Fn(() => If(cond, () => buffers.positions.element(i))) })
          useLocalNodes(create, [])
        }
      `,
      errors: [{ messageId: 'deferredRead', data: { key: 'buffers' } }],
    },
  ],
})
