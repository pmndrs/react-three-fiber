const { addWebpackAlias, removeModuleScopePlugin, babelInclude, override } = require('customize-cra')
const { addReactRefresh } = require('customize-cra-react-refresh')
const path = require('path')

module.exports = (config, env) => {
  config.resolve.extensions = [...config.resolve.extensions, '.ts', '.tsx']
  return override(
    addReactRefresh(),
    removeModuleScopePlugin(),
    babelInclude([path.resolve('src'), path.resolve('../src')]),
    addWebpackAlias({
      'react-three-fiber': path.resolve('../src/targets/web'),
      react: path.resolve('node_modules/react'),
      'react-dom': path.resolve('node_modules/react-dom'),
      scheduler: path.resolve('node_modules/scheduler'),
      'react-scheduler': path.resolve('node_modules/react-scheduler'),
      'prop-types': path.resolve('node_modules/prop-types'),
      //three: path.resolve('node_modules/three'),
      //three$: path.resolve('node_modules/three/src/Three'),
      //three$: path.resolve('./resources/three.js'),
      //'../../../build/three.module.js': path.resolve('./resources/three.js'),
    })
  )(config, env)
}
