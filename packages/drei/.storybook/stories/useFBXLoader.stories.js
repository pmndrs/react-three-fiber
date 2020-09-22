import React, { Suspense } from 'react'

import { Setup } from '../Setup'
import {useFBXLoader} from "../../src/loaders/useFBXLoader";
import {useCubeTextureLoader} from "../../src";

export default {
  title: 'Loaders/FBX',
  component: useFBXLoader,
  decorators: [(storyFn) => <Setup cameraPosition={[0, 0, 5]}>{storyFn()}</Setup>],
}

function SuzanneFBX() {
  const fbx = useFBXLoader('suzanne/suzanne.fbx')
  const envMap = useCubeTextureLoader(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'], { path: 'cube/' })

  return (
    <mesh 
      {...fbx.children[0]} 
      material-envMap={envMap} 
      material-reflectivity={1}
    />
  )
}

function UseFBXLoaderScene() {
  return (
    <Suspense fallback={null}>
      <SuzanneFBX />
    </Suspense>
  )
}

export const UseFBXLoaderSceneSt = () => <UseFBXLoaderScene />
UseFBXLoaderSceneSt.story = {
  name: 'Default',
}
