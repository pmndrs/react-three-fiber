import React, { useMemo, useRef, useEffect } from 'react'
import { linkTo } from '@storybook/addon-links'
import { Canvas, useFrame } from 'react-three-fiber'
import * as THREE from 'three'

import { Setup } from '../.storybook/Setup'

import { Extrude } from '../src/shapes'
import { OrbitControls } from '../src/OrbitControls'

export default {
    title: 'Shapes.Extrude',
    component: Extrude,
    decorators: [(storyFn) => <Setup cameraPosition={[-30, 30, 30]}>{storyFn()}</Setup>],
}

function useTurntable() {

    const ref = React.useRef()
    useFrame(() => {
        ref.current.rotation.y += 0.01
    })

    return ref

}

function ExtrudeScene() {

    const shape = useMemo(() => {

        const shape = new THREE.Shape()

        const width = 8, length = 12

        shape.moveTo(0, 0);
        shape.lineTo(0, width);
        shape.lineTo(length, width);
        shape.lineTo(length, 0);
        shape.lineTo(0, 0);

        return shape

    }, [])

    const extrudeSettings = useMemo(() => ({
        steps: 2,
        depth: 16,
        bevelEnabled: true,
        bevelThickness: 1,
        bevelSize: 1,
        bevelOffset: 0,
        bevelSegments: 1
    }), []);

    console.log(shape)

    return (
        <>
            <OrbitControls />
            <Extrude args={[shape, extrudeSettings]}>
                <meshPhongMaterial attach="material" color="#f3f3f3" wireframe />
            </Extrude>
        </>
    )

}


export const ExtrudeSt = () => <ExtrudeScene />
ExtrudeSt.story = {
    name: "Default"
}
