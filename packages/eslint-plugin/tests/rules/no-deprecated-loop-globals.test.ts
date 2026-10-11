import rule from '../../src/rules/no-deprecated-loop-globals'
import { tester } from '../tester'

tester.run('no-deprecated-loop-globals', rule, {
  valid: [
    `useFrame(update, { phase: 'start' })`,
    // Not from fiber
    `import { addEffect } from './effects'; addEffect(run)`,
  ],
  invalid: [
    {
      code: `import { addEffect, addAfterEffect, addTail as onTail } from '@react-three/fiber'
        addEffect(before)
        addAfterEffect(after)
        onTail(idle)`,
      errors: [
        { messageId: 'deprecated', data: { name: 'addEffect', replacement: "useFrame(callback, { phase: 'start' })" } },
        {
          messageId: 'deprecated',
          data: { name: 'addAfterEffect', replacement: "useFrame(callback, { phase: 'finish' })" },
        },
        { messageId: 'deprecated', data: { name: 'addTail', replacement: 'scheduler.onIdle(callback)' } },
      ],
    },
  ],
})
