import * as ts from 'typescript'
import { COMPILER_OPTIONS } from './constants'

export const resolveModule = (compilerHost: ts.CompilerHost, file: string, parent: string) => {
  const { resolvedModule } = ts.nodeModuleNameResolver(file, parent, COMPILER_OPTIONS, compilerHost)

  if (!resolvedModule) {
    throw new Error(`Could not resolve module "${file}"`)
  }

  return resolvedModule.resolvedFileName
}
