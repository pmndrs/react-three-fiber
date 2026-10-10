import rule from '../../src/rules/no-inline-node-props'
import { tester } from '../tester'

tester.run('no-inline-node-props', rule, {
  valid: [
    `<meshStandardNodeMaterial positionNode={positionNode} />`,
    `<meshStandardNodeMaterial colorNode={nodes.color} />`,
    `<meshPhongNodeMaterial lightsNode={fromRef(lightRef, (light) => lights([light]))} />`,
    // Not a *Node prop
    `<meshStandardNodeMaterial color={new Color('red')} />`,
    // Not a material
    `<Thing colorNode={color(0xff0000)} />`,
    `<mesh userNode={make()} />`,
  ],
  invalid: [
    {
      code: `<meshStandardNodeMaterial positionNode={positionLocal.add(normalLocal.mul(sin(time)))} />`,
      errors: [{ messageId: 'inlineNode', data: { prop: 'positionNode' } }],
    },
    {
      code: `<meshBasicNodeMaterial colorNode={uniforms.uColor.mul(2)} opacityNode={float(0.5)} />`,
      errors: [
        { messageId: 'inlineNode', data: { prop: 'colorNode' } },
        { messageId: 'inlineNode', data: { prop: 'opacityNode' } },
      ],
    },
    {
      code: `<meshStandardMaterial colorNode={new ColorNode()} />`,
      errors: [{ messageId: 'inlineNode' }],
    },
  ],
})
