import rule from '../../src/rules/no-nested-fromref'
import { tester } from '../tester'

tester.run('no-nested-fromref', rule, {
  valid: [
    `<spotLight target={fromRef(targetRef)} />`,
    `<meshPhongNodeMaterial lightsNode={fromRef(lightRef, (light) => lights([light]))} />`,
    `const target = fromRef(targetRef)`,
  ],
  invalid: [
    {
      code: `<meshPhongNodeMaterial lightsNode={lights([fromRef(lightRef)])} />`,
      errors: [{ messageId: 'nested' }],
    },
    {
      code: `<orbitControls args={[fromRef(cameraRef)]} />`,
      errors: [{ messageId: 'nested' }],
    },
    {
      code: `<thing options={{ target: fromRef(targetRef) }} />`,
      errors: [{ messageId: 'nested' }],
    },
  ],
})
