import rule from '../../src/rules/no-removed-canvas-props'
import { tester } from '../tester'

const fiber = `import { Canvas } from '@react-three/fiber';\n`
const legacy = `import { Canvas } from '@react-three/fiber/legacy';\n`

tester.run('no-removed-canvas-props', rule, {
  valid: [
    fiber + `<Canvas renderer={{ shadows: true }} scheduler={{ fps: 30 }} />`,
    legacy + `<Canvas gl={{ shadows: 'soft' }} />`,
    fiber + `<Canvas renderer={false} />`,
    // Not R3F's Canvas
    `import { Canvas } from 'other';\n<Canvas shadows flat />`,
  ],
  invalid: [
    {
      code: fiber + `<Canvas shadows />`,
      output: fiber + `<Canvas renderer={{ shadows: true }} />`,
      errors: [
        { messageId: 'movedToBag', data: { prop: 'shadows', bag: 'renderer', throws: ' The old prop throws.' } },
      ],
    },
    {
      code: legacy + `<Canvas shadows="variance" gl={{ antialias: false }} />`,
      output: legacy + `<Canvas gl={{ shadows: "variance", antialias: false }} />`,
      errors: [{ messageId: 'movedToBag' }],
    },
    {
      code: fiber + `<Canvas renderer textureColorSpace={space} />`,
      output: fiber + `<Canvas renderer={{ textureColorSpace: space }} />`,
      errors: [{ messageId: 'movedToBag' }],
    },
    {
      code: fiber + `<Canvas flat linear legacy />`,
      errors: [
        { messageId: 'ignored', data: { prop: 'flat', hint: 'use `renderer={{ toneMapping: THREE.NoToneMapping }}`' } },
        {
          messageId: 'ignored',
          data: { prop: 'linear', hint: 'use `renderer={{ outputColorSpace: THREE.LinearSRGBColorSpace }}`' },
        },
        { messageId: 'ignored', data: { prop: 'legacy', hint: 'ColorManagement is always enabled now; remove it' } },
      ],
    },
    {
      code: fiber + `<Canvas renderer={{ primaryCanvas: 'main', scheduler: { fps: 30 } }} />`,
      errors: [{ messageId: 'movedOut' }, { messageId: 'movedOut' }],
    },
    {
      code: fiber + `<Canvas renderer camera={camera} />`,
      output: fiber + `<Canvas camera={camera} />`,
      errors: [{ messageId: 'rendererBoolean', data: { entry: '@react-three/fiber' } }],
    },
  ],
})
