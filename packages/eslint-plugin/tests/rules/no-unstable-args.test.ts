import rule from '../../src/rules/no-unstable-args'
import { tester } from '../tester'

tester.run('no-unstable-args', rule, {
  valid: [
    `<boxGeometry args={[1, 1, 1]} />`,
    `<planeGeometry args={[width, height, segments * 2]} />`,
    `<bufferAttribute attach="attributes-position" args={[array, 3]} />`,
    `<tubeGeometry args={[curve, 64, 0.1]} />`,
    `<primitive object={scene} />`,
    // args held in a variable: its stability is the caller's business
    `<boxGeometry args={args} />`,
    // Components are not R3F elements
    `<Box args={[new Vector3()]} />`,
  ],
  invalid: [
    {
      code: `<bufferAttribute attach="attributes-position" args={[new Float32Array(positions), 3]} />`,
      errors: [{ messageId: 'unstableArg', data: { kind: 'new Float32Array()' } }],
    },
    {
      code: `<extrudeGeometry args={[shape, { depth: 1 }]} />`,
      errors: [{ messageId: 'unstableArg', data: { kind: 'an object literal' } }],
    },
    {
      code: `<tubeGeometry args={[new THREE.CatmullRomCurve3([a, b]), 64]} />`,
      errors: [{ messageId: 'unstableArg', data: { kind: 'new CatmullRomCurve3()' } }],
    },
    {
      code: `<latheGeometry args={[[v1, v2, v3]]} />`,
      errors: [{ messageId: 'unstableArg', data: { kind: 'an array literal' } }],
    },
    {
      code: `<mesh args={[geometry.clone(), () => material]} />`,
      errors: [
        { messageId: 'unstableArg', data: { kind: 'a .clone() call' } },
        { messageId: 'unstableArg', data: { kind: 'an inline function' } },
      ],
    },
    {
      code: `<primitive object={gltf.scene.clone()} />`,
      errors: [{ messageId: 'unstableObject', data: { kind: 'a .clone() call' } }],
    },
    {
      code: `<primitive object={new THREE.AxesHelper(5)} />`,
      errors: [{ messageId: 'unstableObject' }],
    },
  ],
})
