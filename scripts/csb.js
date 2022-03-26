/**
 * Takes all the examples in /examples and sets up codesandbox-ready projects for them
 */
const examplesFolder = './example/src/demos'
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')

const csbJson = require('../.codesandbox/ci.json')

fs.readdir(examplesFolder, async (err, files) => {
  const filtered = files.filter((file) => {
    return file.indexOf('index') === -1
  })

  csbJson.sandboxes = ['/example']

  await Promise.all(
    filtered.map(async (file) => {
      const dir = `./.codesandbox/sandboxes/${file.replace('.tsx', '')}`
      await fse.copy('./.codesandbox/_template/', dir, { overwrite: true })
      await fse.copy(path.join(examplesFolder, file), path.join(dir, 'src', 'Scene.tsx'), { overwrite: true })
      // update ci.json
      csbJson.sandboxes.push(dir)
    }),
  )

  fs.writeFileSync('./.codesandbox/ci.json', JSON.stringify(csbJson))

  let exec = require('child_process').exec
  exec('yarn prettier --write .codesandbox/ci.json')
})
