import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { Loader } from 'three'

export function draco(url: string = '/draco-gltf/') {
  return (loader: Loader) => {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(url)
    ;(loader as GLTFLoader).setDRACOLoader(dracoLoader)
  }
}
