import rule from '../../src/rules/canvas-entry-compat'
import { tester } from '../tester'

const fiber = `import { Canvas } from '@react-three/fiber';\n`
const legacy = `import { Canvas } from '@react-three/fiber/legacy';\n`

tester.run('canvas-entry-compat', rule, {
  valid: [
    fiber + `<Canvas renderer={{ antialias: false }} />`,
    fiber + `<Canvas primary id="main" />`,
    fiber + `<Canvas gl={undefined} renderer />`,
    legacy + `<Canvas gl={{ antialias: false }} />`,
    legacy + `<Canvas renderer={false} share={false} />`,
    // GLSL on /legacy and node materials on the default entry are what each renders
    legacy + `<Canvas><mesh><shaderMaterial /></mesh></Canvas>`,
    fiber + `<Canvas><mesh onOccluded={hide}><meshStandardNodeMaterial /></mesh></Canvas>`,
    // A Canvas from elsewhere, or no Canvas in the file
    `import { Canvas } from 'other';\n<Canvas gl={{}} />`,
    `<mesh><shaderMaterial /></mesh>`,
    // Both entries in one file: the renderer of a given element is unknown
    `import { Canvas } from '@react-three/fiber';\nimport { Canvas as LegacyCanvas } from '@react-three/fiber/legacy';\n<mesh><shaderMaterial /></mesh>`,
  ],
  invalid: [
    {
      code: fiber + `<Canvas gl={{ antialias: false }} />`,
      errors: [{ messageId: 'glOnWebGPU', data: { entry: '@react-three/fiber' } }],
    },
    {
      code: `import { Canvas as C } from '@react-three/fiber/webgpu';\n<C gl />`,
      errors: [{ messageId: 'glOnWebGPU', data: { entry: '@react-three/fiber/webgpu' } }],
    },
    {
      code: legacy + `<Canvas renderer />`,
      errors: [{ messageId: 'rendererOnLegacy' }],
    },
    {
      code: legacy + `<Canvas gl={{}} renderer={{}} />`,
      errors: [{ messageId: 'glAndRenderer' }],
    },
    {
      code: legacy + `<Canvas primary share="main" />`,
      errors: [
        { messageId: 'webgpuOnlyProp', data: { prop: 'primary' } },
        { messageId: 'webgpuOnlyProp', data: { prop: 'share' } },
      ],
    },
    {
      code: fiber + `<Canvas primary share="main" />`,
      errors: [{ messageId: 'primaryWithShare', data: { share: 'main' } }],
    },
    {
      code: legacy + `<Canvas><mesh onVisible={show}><meshStandardNodeMaterial /></mesh></Canvas>`,
      errors: [
        { messageId: 'occlusionOnLegacy', data: { prop: 'onVisible' } },
        { messageId: 'nodeMaterialOnLegacy', data: { name: 'meshStandardNodeMaterial' } },
      ],
    },
    {
      code: fiber + `<Canvas><mesh><rawShaderMaterial /></mesh></Canvas>`,
      errors: [{ messageId: 'glslOnWebGPU', data: { name: 'rawShaderMaterial', entry: '@react-three/fiber' } }],
    },
  ],
})
