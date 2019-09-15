#!/usr/bin/env node

const gltfjsx = require('./gltfjsx')
const argv = require('yargs')
  .boolean(['jsx', 'animation'])
  .string('draco')
  .option('jsx', { alias: 'j', describe: 'converts a gltf/glb file to jsx' })
  .option('draco', { alias: 'd', describe: 'adds DRACOLoader', default: '/draco-gltf/' })
  .option('animation', { alias: 'a', describe: 'extracts animation clips' })
  .usage('$0 input [output] --jsx --draco')
  .help().argv

console.log(argv)

if (argv.jsx) {
  gltfjsx(argv._[0], argv._[1], { draco: argv.draco, animation: argv.animation })
}
