import * as ts from 'typescript'

import { COMPILER_OPTIONS, TYPE_OUT_FILE, COMPONENT_OUT_FILE } from './constants'
import { resolveModule } from './resolve'

export const createProgramForModule = (moduleName: string) => {
  const compilerHost = ts.createCompilerHost(COMPILER_OPTIONS)
  const resolvedFileName = resolveModule(compilerHost, moduleName, __filename)
  const program = ts.createProgram({
    rootNames: [resolvedFileName],
    options: COMPILER_OPTIONS,
    host: compilerHost,
  })
  const typeChecker = program.getTypeChecker()
  const sourceFile = program.getSourceFile(resolvedFileName)

  if (!sourceFile) {
    throw new Error(`Could not get source file for module "${moduleName}"`)
  }

  const symbol = typeChecker.getSymbolAtLocation(sourceFile)

  if (!symbol) {
    throw new Error(`Failed to get symbol for module "${moduleName}"`)
  }

  return {
    sourceFile,
    compilerHost,
    program,
    typeChecker,
    symbol,
  }
}

export const typeCheckResults = () => {
  const program = ts.createProgram({
    rootNames: [TYPE_OUT_FILE, COMPONENT_OUT_FILE],
    options: COMPILER_OPTIONS,
  })

  const typeSourceFile = program.getSourceFile(TYPE_OUT_FILE)
  const componentSourceFile = program.getSourceFile(COMPONENT_OUT_FILE)
  const diagnostics = [
    ...ts.getPreEmitDiagnostics(program, typeSourceFile),
    ...ts.getPreEmitDiagnostics(program, componentSourceFile),
  ]

  diagnostics.forEach((diagnostic) => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')

    if (diagnostic.file) {
      if (typeof diagnostic.start === 'number') {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
        console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`)
      } else {
        console.log(`${diagnostic.file.fileName}: ${message}`)
      }
    } else {
      console.log(message)
    }
  })

  const exitCode = diagnostics.length ? 1 : 0
  console.log(`Process exiting with code '${exitCode}'.`)
  process.exit(exitCode)
}
