import rule from '../../src/rules/no-removed-imports'
import { tester } from '../tester'

tester.run('no-removed-imports', rule, {
  valid: [
    `import { Canvas, useFrame } from '@react-three/fiber'`,
    `import { Canvas } from '@react-three/fiber/legacy'`,
    `import { useUniforms, useRenderPipeline } from '@react-three/tsl'`,
    `import { act } from 'react'`,
    `import ReactThreeTestRenderer from '@react-three/test-renderer'`,
  ],
  invalid: [
    {
      code: `import { Canvas, useFrame } from '@react-three/fiber/native'`,
      output: `import { Canvas, useFrame } from '@react-three/native'`,
      errors: [{ messageId: 'nativeMoved' }],
    },
    {
      code: `import { Canvas } from "@react-three/fiber/webgpu"`,
      output: `import { Canvas } from "@react-three/fiber"`,
      errors: [{ messageId: 'webgpuDeprecated' }],
    },
    {
      code: `import ReactThreeTestRenderer from '@react-three/test-renderer/webgpu'`,
      output: `import ReactThreeTestRenderer from '@react-three/test-renderer'`,
      errors: [{ messageId: 'webgpuDeprecated' }],
    },
    {
      // Every name moves: the path is rewritten
      code: `import { useUniforms, useNodes } from '@react-three/fiber/webgpu'`,
      output: `import { useUniforms, useNodes } from '@react-three/tsl'`,
      errors: [
        { messageId: 'tslMoved', data: { name: 'useUniforms' } },
        { messageId: 'tslMoved', data: { name: 'useNodes' } },
      ],
    },
    {
      // Mixed: reported, but the import has to be split by hand
      code: `import { Canvas, useUniforms } from '@react-three/fiber/webgpu'`,
      errors: [{ messageId: 'tslMoved', data: { name: 'useUniforms' } }],
    },
    {
      code: `import { act, flushGlobalEffects } from '@react-three/fiber'`,
      errors: [
        { messageId: 'removed', data: { name: 'act', hint: "import `act` from 'react'" } },
        {
          messageId: 'removed',
          data: { name: 'flushGlobalEffects', hint: 'use useFrame phases, or the scheduler from getScheduler()' },
        },
      ],
    },
    {
      code: `import { usePostProcessing, clearRootUniforms } from '@react-three/tsl'`,
      errors: [{ messageId: 'removed' }, { messageId: 'removed' }],
    },
    {
      code: `export { Canvas } from '@react-three/fiber/webgpu'`,
      output: `export { Canvas } from '@react-three/fiber'`,
      errors: [{ messageId: 'webgpuDeprecated' }],
    },
  ],
})
