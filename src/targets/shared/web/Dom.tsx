import { Vector3, Group } from 'three'
import React, { useRef, useMemo, useEffect, useLayoutEffect } from 'react'
import ReactDOM from 'react-dom'
import { useFrame, useThree } from '../../../hooks'
import { ReactThreeFiber } from '../../../three-types'

export const Dom = ({
  children,
  eps = 0.001,
  style,
  className,
  prepend,
  ...props
}: {
  children: React.ReactNode
  prepend?: boolean
  eps?: number
} & React.HTMLAttributes<HTMLDivElement> &
  ReactThreeFiber.Object3DNode<Group, typeof Group>) => {
  const { gl, camera, viewport } = useThree()
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
      if (Math.abs(old.current[0] - x) > eps || Math.abs(old.current[1] - y) > eps) {
        div.current.style.transform = `translate3d(${x}px,${y}px,0)`
      }
      old.current = [x, y]
    }
  })

  const elRef = useRef<HTMLDivElement>()
  useLayoutEffect(() => {
    const el = (elRef.current = document.createElement('div'))
    el.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;'
    if (gl.domElement.parentNode) {
      if (prepend) gl.domElement.parentNode.prepend(el)
      else gl.domElement.parentNode.appendChild(el)
    }
    return () => {
      if (gl.domElement.parentNode) gl.domElement.parentNode.removeChild(el)
      ReactDOM.unmountComponentAtNode(el)
    }
  }, [])

  useEffect(
    () =>
      void (
        elRef.current &&
        ReactDOM.render(
          <div style={{ position: 'absolute', ...style }} className={className} ref={div} children={children} />,
          elRef.current
        )
      ),
    [children]
  )

  return <group {...props} ref={group} />
}
