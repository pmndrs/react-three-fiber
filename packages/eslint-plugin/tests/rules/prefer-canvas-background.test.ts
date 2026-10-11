import rule from '../../src/rules/prefer-canvas-background'
import { tester } from '../tester'

const fiber = `import { Canvas } from '@react-three/fiber';\n`

tester.run('prefer-canvas-background', rule, {
  valid: [
    fiber + `<Canvas background="#1a1a2e" />`,
    fiber + `<Canvas><color attach="color" args={['red']} /></Canvas>`,
    // A portal, View or render target has its own scene, which the Canvas prop does not reach
    fiber + `<Canvas>{createPortal(<color attach="background" args={['red']} />, scene)}</Canvas>`,
    fiber + `<Canvas><View><color attach="background" args={['red']} /></View></Canvas>`,
    // Outside a Canvas this file renders, the scene is unknown
    `function Scene() { return <color attach="background" args={['red']} /> }`,
    `import { Canvas } from 'other';\n<Canvas><color attach="background" args={['red']} /></Canvas>`,
  ],
  invalid: [
    {
      code: fiber + `<Canvas><color attach="background" args={['#1a1a2e']} /><Scene /></Canvas>`,
      errors: [{ messageId: 'background' }],
    },
  ],
})
