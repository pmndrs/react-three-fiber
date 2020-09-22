import ReactDOM from 'react-dom'
import React, { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react'
import { VRCanvas, useXREvent, DefaultXRControllers, Hands, Select, Hover, useXR } from 'react-xr'
import { useFrame, useThree } from 'react-three-fiber'
import { OrbitControls, Sky, Text, Plane, Box } from 'drei'
import { Color, Box3, BufferGeometry, Vector3, TextureLoader, ImageLoader } from 'three/build/three.module'

function Key({ name, pos = [0, 0], onClick, width = 1, ...rest }) {
  const meshRef = useRef()

  const { gl } = useThree()

  const leftHand = gl.xr.getHand(0)

  const focused = useRef(false)
  useFrame(() => {
    if (!meshRef.current) {
      return
    }
    const leftTip = leftHand.joints[9]
    if (leftTip === undefined) {
      return
    }

    const box = new Box3().setFromObject(meshRef.current)

    if (box.containsPoint(leftTip.position)) {
      if (!focused.current) {
        onClick()
        focused.current = true
        meshRef.current.material.color = new Color(0x444444)
      }
    } else {
      if (focused.current) {
        meshRef.current.material.color = new Color(0xffffff)
        focused.current = false
      }
    }
  })

  const keySize = 0.018
  const keyWidth = width * keySize
  const keyGap = 0.004
  const size = keySize + keyGap

  const xpi = (pos[0] / 10) * Math.PI
  const offset = 0.01 - Math.sin(xpi) / 20

  const position = [size * pos[0], -size * pos[1], offset]

  return (
    <group {...rest} position={position} rotation={[0, Math.cos(xpi) / 2, 0]}>
      <mesh ref={meshRef}>
        <boxBufferGeometry attach="geometry" args={[keyWidth, keySize, 0.02]} />
        <meshStandardMaterial attach="material" color="#fafafa" />
      </mesh>
      <Text position={[0, 0.003, keySize / 1.7]} fontSize={0.015} color="#333">
        {name}
      </Text>
    </group>
  )
}

function Keyboard() {
  const [state, setState] = useState({
    text: '',
    focused: ' ',
  })

  const { gl } = useThree()

  useEffect(() => {
    const rightHand = gl.xr.getHand(1)

    const onPinch = () => {
      setState((it) => {
        const text = it.focused === 'backspace' ? it.text.substring(0, it.text.length - 1) : it.text + it.focused
        return {
          text,
          focused: it.focused,
        }
      })
    }
    rightHand.addEventListener('pinchstart', onPinch)

    return () => {
      rightHand.removeEventListener('pinchstart', onPinch)
    }
  }, [gl, setState])

  const onClick = (key) => () => setState((it) => ({ ...it, focused: key }))

  return (
    <group position={[-0.2, 1.14, -0.4]} rotation={[0, 0, 0]}>
      <Text position={[0.15, 0.1, 0]} fontSize={0.03}>
        {state.text + '|'}
      </Text>
      {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map((key, i) => (
        <Key name={key} pos={[i - 0.2, 0]} onClick={onClick(key)} />
      ))}
      {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map((key, i) => (
        <Key name={key} pos={[i, 1]} onClick={onClick(key)} />
      ))}
      {['z', 'x', 'c', 'v', 'b', 'n', 'm'].map((key, i) => (
        <Key name={key} pos={[i + 0.4, 2]} onClick={onClick(key)} />
      ))}
      <Key name={' '} pos={[3, 3]} onClick={onClick(' ')} width={5} />
      <Key name={'<'} pos={[8, 3]} onClick={onClick('backspace')} />
    </group>
  )
}

function Button(props) {
  const [hover, setHover] = useState(false)
  const [color, setColor] = useState(0x123456)

  const onSelect = useCallback(() => {
    setColor((Math.random() * 0xffffff) | 0)
  }, [setColor])

  return (
    <Select onSelect={onSelect}>
      <Hover onChange={setHover}>
        <Box scale={hover ? [1.5, 1.5, 1.5] : [1, 1, 1]} args={[0.4, 0.1, 0.1]} {...props}>
          <meshStandardMaterial attach="material" color={color} />
          <Text position={[0, 0, 0.06]} fontSize={0.05} color="#000" anchorX="center" anchorY="middle">
            Hello react-xr!
          </Text>
        </Box>
      </Hover>
    </Select>
  )
}

function App() {
  return (
    <VRCanvas>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} />

      <Hands />
      <DefaultXRControllers />
      <Button position={[0, 0.8, -1]} />
    </VRCanvas>
  )
}

ReactDOM.render(<App />, document.querySelector('#root'))
