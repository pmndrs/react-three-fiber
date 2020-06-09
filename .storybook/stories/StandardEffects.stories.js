import React, { Suspense } from 'react'

import { Setup } from '../Setup'

import { StandardEffects } from '../../src/StandardEffects'
import { useTurntable } from '../useTurntable'

import { Box, Sphere, Icosahedron, Plane } from '../../src/shapes'

export default {
    title: 'Abstractions.StandardEffects',
    component: StandardEffects,
    decorators: [(storyFn) => <Setup>{storyFn()}</Setup>],
}

function StandardEffectsScene() {

    return (
        <>
            <Box receiveShadow castShadow position={[0, 0, 0]} >
                <meshPhongMaterial attach="material" color="#333" />
            </Box>
            <Box receiveShadow castShadow position={[2, 0, 0]} >
                <meshPhongMaterial attach="material" color="#fff" />
            </Box>
            <Box receiveShadow castShadow position={[-2, 0, 0]} >
                <meshPhongMaterial attach="material" color="red" />
            </Box>

            <Plane receiveShadow rotation={[-Math.PI / 2, 0, 0]} args={[8, 8, 8]} position={[0, -0.5, 0]}>
                <meshPhongMaterial attach="material" color="#222" />
            </Plane>

            <spotLight
                intensity={2}
                position={[6, 5, 5]}
                shadow-bias={-0.00005}
                angle={Math.PI / 6}
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                castShadow
            />

            {/* StandardEffects needs to be wrapped by Suspense */}
            <Suspense fallback={'lorem'}  >
                <StandardEffects
                    bloom={{ luminanceThreshold: 0.1 }}
                    smaa                      // Can be a boolean (default=true)
                    edgeDetection={0.4}
                    ao                        // Can be a boolean or all valid postprocessing AO props (default=true)
                    bloom
                    bloomOpacity={0.6}
                />
            </Suspense>
        </>
    )
}

export const StandardEffectsSt = () => <StandardEffectsScene />
StandardEffectsSt.story = {
    name: 'Default',
}
