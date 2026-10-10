import rule from '../../src/rules/no-numeric-frame-priority'
import { tester } from '../tester'

tester.run('no-numeric-frame-priority', rule, {
  valid: [
    `useFrame(update)`,
    `useFrame(update, 0)`,
    `useFrame(update, { phase: 'render' })`,
    `useFrame(update, { priority: 2 })`,
    // Not a literal: its value is unknown
    `useFrame(update, priority)`,
    `other(update, 1)`,
  ],
  invalid: [
    {
      code: `useFrame(({ renderer, scene, camera }) => renderer.render(scene, camera), 1)`,
      errors: [
        {
          messageId: 'takeover',
          data: { value: '1' },
          suggestions: [
            {
              messageId: 'useRenderPhase',
              output: `useFrame(({ renderer, scene, camera }) => renderer.render(scene, camera), { phase: 'render' })`,
            },
          ],
        },
      ],
    },
    {
      code: `import { useFrame as useTick } from '@react-three/fiber'; useTick(step, -2)`,
      errors: [{ messageId: 'reversed', data: { value: '-2' } }],
    },
  ],
})
