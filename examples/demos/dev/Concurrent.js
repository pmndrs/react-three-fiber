import React, { useRef, useEffect } from 'react'
import { Canvas, useFrame } from 'react-three-fiber'
import { Controls, useControl } from 'react-three-gui'
import create from 'zustand'

import ReactDOM from 'react-dom'

console.log(ReactDOM)

let guid = 0
// Returns a random angle
const rpi = () => Math.random() * Math.PI
// This is the store, we're using Zustand here
const [useStore, api] = create(set => ({
  amount: 0,
  boxes: [],
  coords: [],
  // create(n) adds coordinates
  create(amount) {
    const ids = new Array(parseInt(amount)).fill().map((_, i) => guid++)
    set({
      amount,
      boxes: ids,
      coords: ids.reduce((acc, id) => ({ ...acc, [id]: [rpi(), rpi(), rpi()] }), 0),
    })
  },
  // advance() moves them one step
  advance(state) {
    set(state => {
      const coords = {}
      for (let i = 0; i < state.boxes.length; i++) {
        const id = state.boxes[i]
        const [x, y, z] = state.coords[id]
        coords[id] = [x + 0.01, y + 0.01, z + 0.01]
      }
      return { ...state, coords }
    })
  },
}))

// Slow items render through React by binding to the item in the state
// They will be called to update every frame, which is massively taxing ...
function ItemSlow({ id }) {
  const coords = useStore(state => state.coords[id])
  if (!coords) return null
  return (
    <mesh rotation={coords}>
      <boxBufferGeometry args={[2, 2, 2]} attach="geometry" />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

// Fast components are allowed to mutate their view, they're still connected
// to the store, but it won't update/re-render these components. A Zustand feature.
function ItemFast({ id }) {
  const mesh = useRef()
  const coords = useRef([0, 0, 0])
  useEffect(
    () =>
      api.subscribe(
        xyz => (coords.current = xyz),
        state => state.coords[id]
      ),
    [id]
  )
  // useFrame means we're in the Threejs update loop. In there we can mutate state safely.
  useFrame(() => mesh.current && mesh.current.rotation.set(...coords.current))
  return (
    <mesh ref={mesh}>
      <boxBufferGeometry args={[2, 2, 2]} attach="geometry" />
      <meshNormalMaterial attach="material" />
    </mesh>
  )
}

export default function App() {
  const ref = useRef()
  const boxes = useStore(state => state.boxes)
  const amount = useControl('Amount️', { type: 'select', items: [20, 100, 200, 500, 1000, 2000, 10000] })
  const root = useControl('React', {
    type: 'select',
    group: 'performance',
    items: ['legacy (slow)', 'concurrent (fast)'],
  })
  const flux = useControl('Zustand', {
    type: 'select',
    group: 'performance',
    items: ['reactive (slow)', 'transient (fast)'],
  })
  const concurrent = root === 'concurrent (fast)'
  const transient = flux === 'transient (fast)'
  const Component = transient ? ItemFast : ItemSlow

  // This side-effect creates an infinite loop that updates *all* state items by
  // advancing them one step further. This will call the components tied to them.
  useEffect(() => {
    let frame = undefined
    api.getState().create(amount)
    let lastCalledTime = Date.now()
    let fps = 0
    function renderLoop() {
      let delta = (Date.now() - lastCalledTime) / 1000
      lastCalledTime = Date.now()
      fps = 1 / delta
      ref.current.innerText = 'fps ' + fps.toFixed()
      // Change state every frame
      ReactDOM.unstable_batchedUpdates(() => api.getState().advance())
      frame = requestAnimationFrame(renderLoop)
    }
    renderLoop()
    return () => cancelAnimationFrame(frame)
  }, [amount, concurrent, transient])

  // <Canvas concurrent={true/false} is all it takes ...
  return (
    <div style={{ background: transient || concurrent ? '#272737' : 'indianred', width: '100%', height: '100%' }}>
      <Canvas concurrent={concurrent} key={amount + root + flux}>
        {boxes.map(id => (
          <Component key={id} id={id} />
        ))}
      </Canvas>
      <div ref={ref} style={{ position: 'absolute', top: 60, left: 450, color: 'white' }} />
      <Description amount={amount} concurrent={concurrent} transient={transient} />
      <Controls />
    </div>
  )
}

function Description({ amount, transient, concurrent }) {
  const mode = concurrent ? 'Concurrent' : 'Legacy'
  const flux = transient ? 'Transient' : 'Reactive'
  return (
    <div style={{ position: 'absolute', top: 60, left: 60, color: 'white', maxWidth: 350 }}>
      <span>
        {amount} connected components update <b>{transient ? 'transiently' : 'reactively'}</b> 60 times/second in{' '}
        <b>{concurrent ? 'concurrent' : 'legacy'} mode</b>
      </span>
      <hr />
      <span>
        <b>{mode} mode</b>{' '}
        {concurrent
          ? 'means that React renders asynchroneously. It will now batch updates and schedule render passes. If you give it an impossible amount of load, so many render requests that it must choke, it will start to manage these requests to establish a stable 60/fps, by updating components virtually and letting them retain their visual state, using back buffers, etc.'
          : 'means that React renders synchroneously. This is how frameworks usually fare, despite micro-optimizations and good benchmarks. The renderer will eventually crumble under load, which in the web is easy, given that we only have more or less 20ms per frame on the javascript mainthread before we face jank.'}
      </span>
      <p>
        <b>{flux} updates</b>{' '}
        {transient
          ? 'means that the state manager informs components of changes without re-rendering them. This is a Zustand feature, a Redux-like flux state manager.'
          : 'means that the state manager informs components of changes by re-rendering them with fresh props. This is how most state managers, like Redux, usually work.'}
      </p>
    </div>
  )
}
