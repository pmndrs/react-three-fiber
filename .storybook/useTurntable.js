import React, { useRef } from 'react'
import { useFrame } from 'react-three-fiber'

export function useTurntable() {

    const ref = React.useRef()
    useFrame(() => {
        ref.current.rotation.y += 0.01
    })

    return ref

}