import { RuleTester } from 'eslint'
import rule from '../../src/rules/no-fast-state'

const tester = new RuleTester({
  parserOptions: { ecmaVersion: 2015 },
})

tester.run('no-fast-state', rule, {
  valid: [
    `
    useFrame((_, delta) => {
        ref.current.position.x += 63 * delta // ~1.008 when 60fps
    })
  `,
    `
  function MatchPointer() {
    const ref = useRef()
  
    return (
      <mesh
        onPointerMove={(e) => {
          ref.current.position.x = e.point.x
        }}
      />
    )
  }
  `,
    `
  function MatchPointer() {
    const ref = useRef()
    const [outside, setOutside] = useState(false)
  
    useFrame((_, delta) => {
      if (ref.current.position.x > 200 && !outside) {
        setOutside(true)
      } else if (ref.current.position.x <= 200 && outside) {
        setOutside(false)
      }
    })
  
    return <mesh ref={ref} />
  }
  `,
  ],
  invalid: [
    {
      code: `
        useEffect(() => {
          const interval = setInterval(() => setX((x) => x + 0.1), 16)
          return () => clearInterval(interval)
        }, [])
      `,
      errors: [{ messageId: 'noUnconditionalSet' }],
    },
    {
      code: `
        const [x, setX] = useState(0)

        useFrame(() => {
          setX((x) => x + 0.1)
        })
      `,
      errors: [{ messageId: 'noUnconditionalSet' }],
    },
    {
      code: `
        function MatchPointer() {
          const [x, setX] = useState(0)
        
          return <mesh onPointerMove={(e) => setX((x) => e.point.x)} />
        }
      `,
      errors: [{ messageId: 'noFastEventSet' }],
    },
  ],
})
