import rule from '../../src/rules/no-onupdate-prop'
import { tester } from '../tester'

tester.run('no-onupdate-prop', rule, {
  valid: [`<mesh ref={ref} />`, `<Slider onUpdate={setValue} />`],
  invalid: [
    {
      code: `<bufferGeometry onUpdate={(self) => self.computeVertexNormals()} />`,
      errors: [{ messageId: 'onUpdate' }],
    },
    {
      code: `<texture onUpdate={(self) => (self.needsUpdate = true)} />`,
      errors: [{ messageId: 'onUpdate' }],
    },
  ],
})
