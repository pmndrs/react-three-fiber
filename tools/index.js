#!/usr/bin/env node

const gltfjsx = require('./gltf-jsx')

const cmd = process.argv[2]
const file = process.argv[3]
const ext = process.argv[4]

switch (cmd) {
  case '--jsx':
    gltfjsx(file, ext)
    break
  default:
  case '--help':
    console.log(` `)
    console.log(`  react-three fiber`)
    console.log(`    --jsx inputfile [outputfile]\tconverts a gltf file to jsx`)
    break
}
