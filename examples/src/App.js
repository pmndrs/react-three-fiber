import React from 'react'

export default function App() {
  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="red" />
    </mesh>
  )
}
