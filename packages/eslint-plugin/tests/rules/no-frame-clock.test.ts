import rule from '../../src/rules/no-frame-clock'
import { tester } from '../tester'

tester.run('no-frame-clock', rule, {
  valid: [
    `useFrame(({ elapsed }) => { ref.current.rotation.y = elapsed })`,
    `useFrame((state, delta) => { ref.current.rotation.y += delta })`,
    // A clock of your own
    `const clock = new Clock(); useFrame(() => clock.getElapsedTime())`,
  ],
  invalid: [
    {
      code: `useFrame((state) => { ref.current.rotation.y = state.clock.getElapsedTime() })`,
      output: `useFrame((state) => { ref.current.rotation.y = state.elapsed })`,
      errors: [{ messageId: 'frameClock' }],
    },
    {
      code: `useFrame((s) => s.clock.elapsedTime * 2)`,
      output: `useFrame((s) => s.elapsed * 2)`,
      errors: [{ messageId: 'frameClock' }],
    },
    {
      // getDelta and destructuring have no direct rewrite
      code: `useFrame(({ clock }) => clock.getDelta()); useFrame((state) => state.clock.getDelta())`,
      errors: [{ messageId: 'frameClock' }, { messageId: 'frameClock' }],
    },
    {
      code: `const clock = useThree((state) => state.clock)`,
      errors: [{ messageId: 'threeClock' }],
    },
  ],
})
