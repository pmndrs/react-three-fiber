import React, { useState, useCallback } from 'react'
import { Canvas } from 'react-three-fiber'

export default function App() {
  const [count, setCount] = useState(0)

  const onButtonClick = useCallback(() => setCount(count + 1), [count])

  return (
    <div className="App">
      <h1>Hello Leak {count}</h1>
      <Canvas key={count} style={{ backgroundColor: 'blue' }}></Canvas>
      <button onClick={onButtonClick}>Recreate Canvas</button>
    </div>
  )
}
