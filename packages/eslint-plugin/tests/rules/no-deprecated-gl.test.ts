import rule from '../../src/rules/no-deprecated-gl'
import { tester } from '../tester'

tester.run('no-deprecated-gl', rule, {
  valid: [
    `const { renderer } = useThree()`,
    `const renderer = useThree((s) => s.renderer)`,
    `useFrame(({ renderer, scene, camera }) => renderer.render(scene, camera))`,
    // Not R3F state
    `const { gl } = useContext(GLContext)`,
    `const gl = canvas.getContext('webgl2'); gl.clear(gl.COLOR_BUFFER_BIT)`,
    `useEffect(() => { props.gl.dispose() })`,
  ],
  invalid: [
    {
      code: `const { gl, size } = useThree()`,
      output: `const { renderer: gl, size } = useThree()`,
      errors: [{ messageId: 'deprecatedGl' }],
    },
    {
      code: `const domElement = useThree((state) => state.gl.domElement)`,
      output: `const domElement = useThree((state) => state.renderer.domElement)`,
      errors: [{ messageId: 'deprecatedGl' }],
    },
    {
      code: `const three = useThree(); three.gl.setPixelRatio(2)`,
      output: `const three = useThree(); three.renderer.setPixelRatio(2)`,
      errors: [{ messageId: 'deprecatedGl' }],
    },
    {
      code: `useFrame(({ gl: r, scene, camera }) => r.render(scene, camera), 1)`,
      output: `useFrame(({ renderer: r, scene, camera }) => r.render(scene, camera), 1)`,
      errors: [{ messageId: 'deprecatedGl' }],
    },
    {
      code: `
        function Effect() {
          const render = (state) => state.gl.render(state.scene, state.camera)
          useFrame(render)
        }
      `,
      output: `
        function Effect() {
          const render = (state) => state.renderer.render(state.scene, state.camera)
          useFrame(render)
        }
      `,
      errors: [{ messageId: 'deprecatedGl' }],
    },
  ],
})
