const { addWebpackAlias, removeModuleScopePlugin, babelInclude, override } = require('customize-cra')
const path = require('path')

module.exports = (config, env) => {
  config.resolve.extensions = [...config.resolve.extensions, '.ts', '.tsx']
  return override(
    removeModuleScopePlugin(),
    babelInclude([path.resolve('src'), path.resolve('../src')]),
    addWebpackAlias({
      react: path.resolve('../node_modules/react'),
      scheduler: path.resolve('../node_modules/scheduler'),
      'react-three-fiber': path.resolve('../src/web/index'),      
      'react-dom': path.resolve('../node_modules/react-dom'),
      'react-scheduler': path.resolve('../node_modules/react-scheduler'),
      'prop-types': path.resolve('../node_modules/prop-types'),
    })
  )(config, env)
}
