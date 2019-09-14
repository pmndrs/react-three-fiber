const fs = require('fs')
require('jsdom-global')()
const THREE = (global.THREE = require('three'))
require('./bin/GLTFLoader')
const DracoLoader = require('./bin/dracoloader')

THREE.DRACOLoader.getDecoderModule = () => {}

function toArrayBuffer(buf) {
  var ab = new ArrayBuffer(buf.length)
  var view = new Uint8Array(ab)
  for (var i = 0; i < buf.length; ++i) {
    view[i] = buf[i]
  }
  return ab
}

const gltfLoader = new THREE.GLTFLoader()
gltfLoader.setDRACOLoader(new DracoLoader())

function print(objects, obj, level = 0, parent) {
  let result = ''
  let space = new Array(level).fill(' ').join('')
  let children = ''
  let type = obj.type.charAt(0).toLowerCase() + obj.type.slice(1)
  let currentId = objects.indexOf(obj)
  let parentId = objects.indexOf(parent)

  if (obj.children) obj.children.forEach(child => (children += print(objects, child, level + 2, obj)))
  if (obj.geometry) children += print(objects, obj.geometry, level + 2, obj)
  if (obj.material) children += print(objects, obj.material, level + 2, obj)

  result = `${space}<${type} `

  if (obj.isMaterial) result += `attach="material" {...objects[${parentId}].material} `
  if (obj.isGeometry || obj.isBufferGeometry) result += `attach="geometry" {...objects[${parentId}].geometry} `
  if (obj.name.length) result += `name="${obj.name}" `
  if (obj.visible === false) result += `visible={false} `

  if (obj.morphTargetDictionary) result += `morphTargetDictionary={objects[${currentId}].morphTargetDictionary} `
  if (obj.morphTargetInfluences) result += `morphTargetInfluences={objects[${currentId}].morphTargetInfluences} `

  if (obj.position instanceof THREE.Vector3 && obj.position.length())
    result += `position={[${obj.position.x}, ${obj.position.y}, ${obj.position.z},]} `
  if (obj.rotation instanceof THREE.Euler && obj.rotation.toVector3().length())
    result += `rotation={[${obj.rotation.x}, ${obj.rotation.y}, ${obj.rotation.z},]} `
  if (obj.scale instanceof THREE.Vector3 && obj.scale.x !== 1 && obj.scale.y !== 1 && obj.scale.z !== 1)
    result += `scale={[${obj.scale.x}, ${obj.scale.y}, ${obj.scale.z},]} `
  result += `${children.length ? '>' : '/>'}\n`

  if (children.length) result += children + `${space}</${type}>${!parent ? '' : '\n'}`
  return result
}

function printClips(gltf) {
  return (
    '    actions.current = {\n' +
    gltf.animations.map((clip, i) => `      "${clip.name}": mixer.current.clipAction(gltf.animations[${i}]),\n`) +
    '    }'
  )
}

function printAnimations(gltf) {
  return gltf.animations && gltf.animations.length
    ? `
  const mixer = useRef()
  const actions = useRef({})
  useFrame((state, delta) => mixer.current && mixer.current.update(delta))
  useEffect(() => {
    const root = group.current
    mixer.current = new THREE.AnimationMixer(root)
${printClips(gltf)}
    return () => root && mixer.current && mixer.current.uncacheRoot(root)
  }, [])\n`
    : ''
}

module.exports = function(file, output) {
  const nameExt = file.match(/[-_\w]+[.][\w]+$/i)[0]
  const name = nameExt
    .split('.')
    .slice(0, -1)
    .join('.')

  const stream = fs.createWriteStream(output || name.charAt(0).toUpperCase() + name.slice(1) + '.js')
  stream.once('open', fd => {
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file)
      const arrayBuffer = toArrayBuffer(data)
      console.log(arrayBuffer)
      gltfLoader.parse(
        arrayBuffer,
        '',
        gltf => {
          console.log(gltf)

          const objects = []
          gltf.scene.traverse(child => objects.push(child))

          stream.write(`import * as THREE from 'three'
import React, { useEffect, useRef } from 'react'
import { useLoader, useFrame } from 'react-three-fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
  
export default function Model({ fallback = null, ...props }) {
  const group = useRef()
  const [gltf, objects] = useLoader(GLTFLoader, '/${nameExt}', loader => {
    const dracoLoader = new DRACOLoader()
    dracoLoader.setDecoderPath('/draco-gltf/')
    loader.setDRACOLoader(dracoLoader)
  })
${printAnimations(gltf)}
  return (
    <group ref={group} {...props}>
${print(objects, gltf.scene, 6)}
    </group>
  )
}`)
          stream.end()
        },
        event => {
          console.log(event)
          console.log('loader failed')
        }
      )
    }
  })
}
