import React, { useMemo, useRef, useEffect } from 'react'
import { linkTo } from '@storybook/addon-links'
import { Canvas, useFrame } from 'react-three-fiber'
import * as THREE from 'three'

import { Setup } from '../.storybook/Setup'
import { useTurntable } from '../.storybook/useTurntable'

import { Lathe } from '../src/shapes'

export default {
    title: 'Shapes.Lathe',
    component: Lathe,
    decorators: [(storyFn) => <Setup cameraPosition={[-30, 30, 30]}>{storyFn()}</Setup>],
}

function LatheScene() {

    const points = useMemo(() => {

        const points = [];
        for (let i = 0; i < 10; i++) {
            points.push(new THREE.Vector2(Math.sin(i * 0.2) * 10 + 5, (i - 5) * 2));
        }

        return points

    }, [])

    const ref = useTurntable()

    return (
        <Lathe ref={ref} args={[points]}>
            <meshPhongMaterial attach="material" color="#f3f3f3" wireframe />
        </Lathe>
    )

}


export const LatheSt = () => <LatheScene />
LatheSt.story = {
    name: "Default"
}
