import { RuleTester } from 'eslint'
import rule from '../../src/rules/no-fast-state'

const tester = new RuleTester({
  parserOptions: { ecmaVersion: 2015 },
})

tester.run('no-fast-state', rule, {
  valid: [
    // useRef pattern (correct approach)
    `
    const meshRef = useRef()
    useFrame(() => {
      meshRef.current.position.x = Math.sin(clock.elapsedTime)
    })
    `,
    // useState setter called outside useFrame is fine
    `
    const [count, setCount] = useState(0)
    const handleClick = () => setCount(count + 1)
    useFrame(() => {
      meshRef.current.rotation.y += 0.01
    })
    `,
    // No useState at all
    `
    useFrame(() => {
      ref.current.position.x += 0.01
    })
    `,
    // Calling a non-setter function inside useFrame is fine
    `
    const [count, setCount] = useState(0)
    const update = () => console.log('ok')
    useFrame(() => {
      update()
    })
    `,
    // useReducer dispatch called outside useFrame is fine
    `
    const [state, dispatch] = useReducer(reducer, initial)
    const handleClick = () => dispatch({ type: 'increment' })
    useFrame(() => {
      ref.current.rotation.y += 0.01
    })
    `,
  ],
  invalid: [
    // Basic useState setter in useFrame
    {
      code: `
        const [position, setPosition] = useState([0, 0, 0])
        useFrame(() => {
          setPosition([Math.sin(clock.elapsedTime), 0, 0])
        })
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    // Multiple setters, one called in useFrame
    {
      code: `
        const [x, setX] = useState(0)
        const [y, setY] = useState(0)
        useFrame(() => {
          setX(Math.sin(clock.elapsedTime))
        })
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    // Multiple setters both called in useFrame
    {
      code: `
        const [x, setX] = useState(0)
        const [y, setY] = useState(0)
        useFrame(() => {
          setX(Math.sin(clock.elapsedTime))
          setY(Math.cos(clock.elapsedTime))
        })
      `,
      errors: [{ messageId: 'noFastState' }, { messageId: 'noFastState' }],
    },
    // useReducer dispatch in useFrame
    {
      code: `
        const [state, dispatch] = useReducer(reducer, initialState)
        useFrame(() => {
          dispatch({ type: 'tick', payload: clock.elapsedTime })
        })
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    // Setter inside nested function in useFrame
    {
      code: `
        const [pos, setPos] = useState(0)
        useFrame(() => {
          const update = () => setPos(1)
          update()
        })
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    // Setter inside conditional in useFrame
    {
      code: `
        const [active, setActive] = useState(false)
        useFrame(() => {
          if (clock.elapsedTime > 5) {
            setActive(true)
          }
        })
      `,
      errors: [{ messageId: 'noFastState' }],
    },
  ],
})
