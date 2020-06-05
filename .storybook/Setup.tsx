import React from 'react'
import { Canvas, useFrame } from 'react-three-fiber'

export function Setup({ children }) {
    return (
        <Canvas colorManagement shadowMap camera={{ position: [-5, 5, 5] }} pixelRatio={window.devicePixelRatio}>
            {children}
            <ambientLight intensity={0.8} />
            <pointLight intensity={1} color={'ffffff'} position={[0, 6, 0]} />
        </Canvas>
    )
}