import React, { useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useRender, Canvas } from 'react-three-fiber'
;(window as any).performance = {
  clearMarks() {},
  measure() {},
  clearMeasures() {},
  mark() {},
}

function Box() {
  const box = useRef()
  useRender(state => {
    if (box.current) {
      box.current.rotation.x += 0.01
      box.current.rotation.y += 0.02
    }
  })
  return (
    <mesh castShadow receiveShadow ref={box}>
      <boxBufferGeometry attach="geometry" args={[1, 1, 1]} />
      <meshStandardMaterial attach="material" color={0xff0000} />
    </mesh>
  )
}

export default function App() {
  return (
    <View style={styles.container}>
      <Canvas>
        <ambientLight intensity={1} />
        <spotLight intensity={0.6} position={[30, 30, 50]} angle={0.2} penumbra={1} castShadow />
        <Box />
      </Canvas>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
})
