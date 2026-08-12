import { RuleTester } from 'eslint'
import rule from '../../src/rules/no-fast-state'

const tester = new RuleTester({
  parserOptions: { ecmaVersion: 2015 },
})

tester.run('no-fast-state', rule, {
  valid: [
    `
    useFrame(() => {
      ref.current.position.x += 0.01
    })
  `,
    `
    useFrame(() => {
      ref.current.rotation.y = clock.getElapsedTime()
    })
  `,
    `
    useFrame(() => {
      vec.set(x, y, z)
    })
  `,
    `
    useFrame(() => {
      setTimeout(() => {}, 1000)
    })
  `,
    `
    useFrame(() => {
      setInterval(() => {}, 1000)
    })
  `,
    `
    const [position, setPosition] = useState(0)
    setPosition(1)
  `,
  ],
  invalid: [
    {
      code: `
        useFrame(() => {
          setPosition(new THREE.Vector3(0, 1, 0))
        })
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    {
      code: `
        useFrame(() => {
          setCount(count + 1)
        })
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    {
      code: `
        useFrame(() => {
          setState({ position: newPos })
        })
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    {
      code: `
        useFrame(() => {
          this.setState({ rotation: newRot })
        })
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    {
      code: `
        useFrame(() => {
          store.setState({ position: newPos })
        })
      `,
      errors: [{ messageId: 'noFastState' }],
    },
  ],
})
