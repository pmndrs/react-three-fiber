import { Vector3, Group } from 'three'
import React, { useRef, useMemo, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useFrame, useThree } from '../../../hooks'
import { ReactThreeFiber } from '../../../three-types'

export const Dom = ({
  container,
  children,
  eps = 0.001,
  ...props
}: {
  container: HTMLElement
  children: React.ReactNode
  eps?: number
} & ReactThreeFiber.Object3DNode<Group, typeof Group>) => {
  const { camera, viewport } = useThree()
  const div = useRef<HTMLDivElement>(null)
  const group = useRef<Group>(null)
  const vector = useMemo(() => new Vector3(), [])
  const old = useRef([0, 0])
  useFrame(() => {
    if (div.current && group.current) {
      group.current.updateMatrixWorld()
      vector.setFromMatrixPosition(group.current.matrixWorld)
      vector.project(camera)
      const x = ((vector.x + 1) * viewport.width) / 2
      const y = ((-vector.y + 1) * viewport.height) / 2
      if (Math.abs(old.current[0] - x) > eps || Math.abs(old.current[1] - y) > eps)
        div.current.style.transform = `translate3d(${x}px,${y}px,0)`
      old.current = [x, y]
    }
  })
  useEffect(
    () => void ReactDOM.render(<div style={{ position: 'absolute' }} ref={div} children={children} />, container)
  )
  useEffect(() => () => void ReactDOM.unmountComponentAtNode(container), [])
  return <group {...props} ref={group} />
}
