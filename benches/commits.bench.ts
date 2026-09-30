import { assert, bench, group } from '@pmndrs/labs'
import { createElement as h, useState, type ReactNode } from 'react'
import { Group, Mesh, Scene } from 'three'
import { ConcurrentRoot } from '../packages/fiber/react-reconciler/constants'
import { extend, reconciler } from '../packages/fiber/src/core/reconciler'
import { flushSync } from '../packages/fiber/src/core/renderer'
import { createStore } from '../packages/fiber/src/core/store'
import { prepare } from '../packages/fiber/src/core/utils/instance'

extend({ Group, Mesh })

const noop = () => {}
const fail = (error: unknown) => {
  throw error
}

// Real R3F commits, without a GPU renderer or frame loop.
function createSceneRoot() {
  const store = createStore(noop, noop)
  const scene = new Scene()
  store.setState({ scene, frameloop: 'never' })
  prepare(scene, store, 'scene', {})
  const root = reconciler.createContainer(store, ConcurrentRoot, null, false, null, '', fail, fail, fail, noop, null)
  return {
    scene,
    render: (element: ReactNode) => flushSync(() => reconciler.updateContainer(element, root, null, noop)),
  }
}

for (const count of [100, 1_000]) {
  group(`sibling commits ${count} @commits @siblings`, () => {
    for (const changing of [false, true]) {
      bench(`new array - ${changing ? 'changing values' : 'same value'}`, function* () {
        const { scene, render } = createSceneRoot()
        const setters: ((value: number) => void)[] = []
        let parentRenders = 0
        let childRenders = 0
        let tick = 0

        function Child({ index }: { index: number }) {
          const [revision, setRevision] = useState(0)
          setters[index] = setRevision
          childRenders++
          const value = changing ? (revision % 2) + 1 : 1
          return h('mesh', { position: [value, value, value] })
        }

        function Parent() {
          parentRenders++
          const children = Array.from({ length: count }, (_, index) => h(Child, { key: index, index }))
          return h('group', { dispose: null }, children)
        }

        render(h(Parent))
        const parent = scene.children[0]
        const meshes = [...parent.children]

        const update = () => {
          childRenders = 0
          tick++
          flushSync(() => setters.forEach((set) => set(tick)))
          return childRenders
        }

        const check = () => {
          assert.equal(parentRenders, 1, 'parent must not rerender')
          assert.equal(childRenders, count)
          assert.equal(parent.children.length, count)
          const value = changing ? (tick % 2) + 1 : 1
          meshes.forEach((mesh, index) => {
            assert(parent.children[index] === mesh, 'siblings must not remount')
            assert.equal(mesh.position.toArray(), [value, value, value])
          })
        }

        try {
          // Check both values before timing so an even tick cannot hide a skipped update.
          for (let i = 0; i < 2; i++) {
            update()
            check()
          }
          const renders = yield update
          check()
          assert.equal(renders, count)
          return renders
        } finally {
          render(null)
        }
      })
    }
  })
}
