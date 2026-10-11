import rule from '../../src/rules/no-fast-state'
import { tester } from '../tester'

tester.run('no-fast-state', rule, {
  valid: [
    // Mutation through a ref
    `
    function Box() {
      const ref = useRef()
      useFrame((state, delta) => { ref.current.rotation.y += delta })
    }
  `,
    // Setting state outside the frame loop
    `
    function Box() {
      const [count, setCount] = useState(0)
      useEffect(() => { setCount(1) }, [])
      return <mesh onClick={() => setCount(count + 1)} />
    }
  `,
    // Guarded updates (the RFC's polling case), in every guard shape
    `
    function Boundary({ target }) {
      const [isOutside, setIsOutside] = useState(false)
      useFrame(() => {
        if (target.current.position.x > 200 && !isOutside) {
          setIsOutside(true)
        } else if (target.current.position.x <= 200 && isOutside) {
          setIsOutside(false)
        }
      })
    }
  `,
    `
    function Boundary() {
      const [outside, setOutside] = useState(false)
      useFrame(() => {
        const next = check()
        next !== outside && setOutside(next)
        next === outside ? null : setOutside(next)
      })
    }
  `,
    `
    function Boundary() {
      const [outside, setOutside] = useState(false)
      useFrame(() => {
        const next = check()
        if (next === outside) return
        setOutside(next)
      })
    }
  `,
    `
    function Boundary() {
      const [mode, setMode] = useState('a')
      useFrame(() => {
        switch (read()) {
          case 'b':
            setMode('b')
        }
      })
    }
  `,
    // Calls that only look like setters
    `
    function Box() {
      useFrame(() => {
        vec.set(x, y, z)
        mesh.setRotationFromEuler(euler)
        setTimeout(() => {}, 1000)
        useStore.setState({ t: 1 })
      })
    }
  `,
    // A setX that is a plain function, not a prop or state
    `
    function setPosition(object) { object.position.x += 1 }
    function Box() {
      useFrame(() => setPosition(ref.current))
    }
  `,
    // Destructured frame state that is not a store setter
    `
    useFrame(({ setSomething, camera }) => { setSomething(camera) })
  `,
    // Discrete pointer events, DOM elements, and guarded continuous events
    `
    function Hover() {
      const [hovered, setHovered] = useState(false)
      const [x, setX] = useState(0)
      return (
        <>
          <mesh onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} />
          <div onPointerMove={(e) => setX(e.clientX)} />
          <mesh onPointerMove={(e) => { if (e.object !== current) setHovered(true) }} />
        </>
      )
    }
  `,
    // events: false
    {
      code: `
        function Hover() {
          const [point, setPoint] = useState()
          return <mesh onPointerMove={(e) => setPoint(e.point)} />
        }
      `,
      options: [{ events: false }],
    },
  ],
  invalid: [
    {
      code: `
        function Box() {
          const [rotation, setRotation] = useState(0)
          useFrame((state, delta) => {
            setRotation((r) => r + delta)
          })
        }
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    {
      // useReducer dispatch, React namespace, expression body
      code: `
        function Box() {
          const [state, dispatch] = React.useReducer(reducer, init)
          useFrame(() => dispatch({ type: 'tick' }))
        }
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    {
      // Setter props, destructured in the signature or from props
      code: `
        function Tracker({ setPosition }) {
          useFrame(() => setPosition(ref.current.position.toArray()))
        }
        function Tracker2(props) {
          const { setPosition } = props
          useFrame(() => setPosition(ref.current.position.toArray()))
        }
      `,
      errors: [{ messageId: 'noFastState' }, { messageId: 'noFastState' }],
    },
    {
      // The R3F store, from the frame state and from useThree
      code: `
        function Scene() {
          const set = useThree((s) => s.set)
          const { setDpr } = useThree()
          useFrame((state) => state.set({ foo: 1 }))
          useFrame(({ setSize }) => setSize(100, 100))
          useFrame(() => {
            set({ foo: 1 })
            setDpr(1)
          })
        }
      `,
      errors: Array(4).fill({ messageId: 'noFastState' }),
    },
    {
      // A callback passed by reference, and a setter scheduled from inside the frame loop
      code: `
        function Box() {
          const [count, setCount] = useState(0)
          const tick = () => setTimeout(() => setCount((c) => c + 1))
          useFrame(tick)
        }
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    {
      // startTransition does not stop the render, it only lowers its priority
      code: `
        function Box() {
          const [pos, setPos] = useState()
          useFrame(() => startTransition(() => setPos(read())))
        }
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    {
      // allowGuarded: false reports guarded updates too
      options: [{ allowGuarded: false }],
      code: `
        function Boundary() {
          const [outside, setOutside] = useState(false)
          useFrame(() => {
            if (check() !== outside) setOutside(!outside)
          })
        }
      `,
      errors: [{ messageId: 'noFastState' }],
    },
    {
      // Continuous pointer events on three.js elements, inline and by reference
      code: `
        function Hover({ setLabel }) {
          const [point, setPoint] = useState()
          const onWheel = (e) => setLabel(e.deltaY)
          return (
            <group>
              <mesh onPointerMove={(e) => setPoint(e.point)} />
              <points onWheel={onWheel} />
            </group>
          )
        }
      `,
      // Reported in source order: the onWheel handler is declared first
      errors: [
        { messageId: 'noEventState', data: { event: 'onWheel' } },
        { messageId: 'noEventState', data: { event: 'onPointerMove' } },
      ],
    },
  ],
})
