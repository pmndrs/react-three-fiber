import fs from 'fs'

export function createDataUriFromGltf(filePath: string) {
  const data = fs.readFileSync(filePath)
  const base64Data = data.toString('base64')
  return `data:model/gltf-binary;base64,${base64Data}`
}
