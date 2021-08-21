/* eslint-disable import/namespace */
/* eslint-disable import/named */
import React, { useMemo, useState } from 'react'
import { PixelRatio, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { Canvas, useFrame } from '../src/native'

const Box = (props: JSX.IntrinsicElements['mesh']) => {
  const myName = useMemo(() => {
    return Math.random().toFixed(4)
  }, [])

  useFrame(({ scene, clock }) => {
    const box = scene.getObjectByName(myName)

    if (!box) {
      return
    }
    box.rotation.x += 0.01 + Math.random() * 0.02
    box.rotation.y += 0.01 + Math.random() * 0.02
    // box.position.x = 5 * Math.sin(clock.elapsedTime)
    // box.position.y = 5 * Math.sin(clock.elapsedTime * 1.2)
  })

  const [isTouched, setIsTouched] = useState(false)

  return (
    <mesh
      name={myName}
      onClick={() => {
        console.log('touched')
        setIsTouched(true)
      }}
      onPointerOver={() => {
        setIsTouched(false)
      }}>
      <boxBufferGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial color={isTouched ? 'pink' : 'blue'} />
    </mesh>
  )
}

function TestThree(props: { style?: StyleProp<ViewStyle> }) {
  const { style } = props
  return (
    <View style={style}>
      <Canvas
        onContextCreated={(gl) => {
          console.log('context created')
        }}>
        <pointLight position={[10, 10, 10]} />
        <ambientLight />
        <Box position={[10, 10, 10]} />
      </Canvas>
    </View>
  )
}

type AppProps = {}
type AppState = {}
export default class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props)
    this.state = {}
  }
  render() {
    return (
      <View style={styles.container}>
        <TestThree style={{ flex: 1, backgroundColor: 'green' }} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
})
