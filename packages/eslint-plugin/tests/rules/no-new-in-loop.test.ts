import rule from '../../src/rules/no-new-in-loop'
import { tester } from '../tester'

tester.run('no-new-in-loop', rule, {
  valid: [
    `
    const vec = new THREE.Vector3()

    useFrame(() => {
      ref.current.position.copy(vec)
    })
  `,
    `
    const vec = new THREE.Vector3()

    useFrame(() => {
      ref.current.position.lerp(vec.set(x, y, z), 0.1)
    })
  `,
    `
    const vec = new Vector3()

    useFrame(() => {
      ref.current.position.copy(vec)
    })
  `,
    `
    const vec = new Vector3()

    useFrame(() => {
      ref.current.position.lerp(vec.set(x, y, z), 0.1)
    })
  `,
    // Options and other arguments are not the frame callback
    `
    useFrame(update, { phase: new Phase() })
  `,
    // A function that is never handed to the frame loop
    `
    function update() {
      ref.current.position.lerp(new Vector3(x, y, z), 0.1)
    }
    onClick(update)
  `,
    // Errors are only built on the failure path
    `
    useFrame(() => {
      try {
        render()
      } catch (error) {
        setError(error instanceof Error ? error : new Error(String(error)))
      }
      if (!ref.current) throw new Invariant('missing ref')
    })
  `,
    // register on something that is not the frame scheduler
    `
    registry.register(() => new Vector3())
  `,
  ],
  invalid: [
    {
      code: `
        useFrame(() => {
          ref.current.position.lerp(new THREE.Vector3(x, y, z), 0.1)
        })
      `,
      errors: [{ messageId: 'noNew' }],
    },
    {
      code: `
        useFrame(() => {
          ref.current.position.lerp(new Vector3(x, y, z), 0.1)
        })
      `,
      errors: [{ messageId: 'noNew' }],
    },
    // Callbacks passed by reference, declared before or after the call
    {
      code: `
        function Mover() {
          const update = () => ref.current.position.lerp(new Vector3(x, y, z), 0.1)
          useFrame(update)
        }
      `,
      errors: [{ messageId: 'noNew' }],
    },
    {
      code: `
        function Mover() {
          useFrame(update)
          function update() {
            ref.current.position.lerp(new Vector3(x, y, z), 0.1)
          }
        }
      `,
      errors: [{ messageId: 'noNew' }],
    },
    {
      code: `
        function Mover() {
          const update = useCallback(() => ref.current.position.lerp(new Vector3(x, y, z), 0.1), [])
          useFrame(update, { phase: 'update' })
        }
      `,
      errors: [{ messageId: 'noNew' }],
    },
    // Aliased and namespaced imports
    {
      code: `
        import { useFrame as useTick } from '@react-three/fiber'
        useTick(() => new Vector3())
      `,
      errors: [{ messageId: 'noNew' }],
    },
    {
      code: `
        import * as Fiber from '@react-three/fiber/webgpu'
        Fiber.useFrame(() => new Vector3())
      `,
      errors: [{ messageId: 'noNew' }],
    },
    // Other per-frame entry points
    {
      code: `
        import { addEffect, addAfterEffect, setRenderOverride, getScheduler } from '@react-three/fiber'
        addEffect(() => new Vector3())
        addAfterEffect(() => new Vector3())
        setRenderOverride(store, () => new Vector3())
        getScheduler().register(() => new Vector3())
        const scheduler = getScheduler()
        scheduler.register(() => new Vector3())
      `,
      errors: Array(5).fill({ messageId: 'noNew' }),
    },
    {
      code: `
        const controls = useFrame()
        controls.scheduler.register(() => new Vector3())
      `,
      errors: [{ messageId: 'noNew' }],
    },
  ],
})
