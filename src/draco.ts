import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'

export function draco(url: string = '/draco-gltf/') {
  return (loader: GLTFLoader) => {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath(url)
    loader.setDRACOLoader(dracoLoader)
  }
}
