/**
 * @see https://github.com/react-spring/react-three-fiber/issues/172#issuecomment-522887899
 */

import { join } from 'path'
import { writeFileSync, readFileSync } from 'fs'
import { execSync } from 'child_process'
import * as ts from 'typescript'

function getInterfacePropertyNames(interfaceName: string) {
  const componentsRecordPath = join(__dirname, 'types.ts')
  const configFile = ts.findConfigFile(__dirname, ts.sys.fileExists, 'tsconfig.json')
  if (!configFile) {
    throw new Error("can't find tsconfig.json")
  }

  const { config, error } = ts.parseConfigFileTextToJson(configFile, readFileSync(configFile, { encoding: 'utf-8' }))
  if (error) {
    console.error(error)
    process.exit(1)
  }

  const { options } = ts.convertCompilerOptionsFromJson(config.compilerOptions, '..')
  const program = ts.createProgram([componentsRecordPath], {
    ...options,
    baseUrl: '..',
    jsx: ts.JsxEmit.React,
  })

  const sourceFile = program.getSourceFile(componentsRecordPath)
  if (!sourceFile) {
    throw new Error("can't find components.tsx. Where is ThreeFiberComponents defined?")
  }

  const typeChecker = program.getTypeChecker()

  const visit = <T extends unknown>(node: ts.Node, f: (n: ts.Node) => T[]): T[] => {
    const results = f(node)
    node.forEachChild(child => {
      results.push(...visit(child, f))
    })

    return results.filter(Boolean)
  }

  return visit(sourceFile, node => {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
      const declaration = node as ts.InterfaceDeclaration

      if (declaration.name.escapedText === interfaceName) {
        return typeChecker
          .getTypeAtLocation(declaration)
          .getProperties()
          .map(symbol => symbol.escapedName)
      }
    }
    return []
  }) as string[]
}

const pascalToCamelCase = (s: string) => `${s[0].toLowerCase()}${s.slice(1)}`

function generateNamedExports(names: string[], exportTypeName: string) {
  return names
    .map(
      exportName =>
        `export const ${exportName} = ` +
        `('${pascalToCamelCase(exportName)}' as any) as ${exportTypeName}['${exportName}']`
    )
    .join('\n')
}

const exportTypeName = 'ThreeFiberComponents'
const outPath = join(__dirname, 'generated.ts')

const text = `\
import { ${exportTypeName} } from './types';

${generateNamedExports(getInterfacePropertyNames(exportTypeName), exportTypeName)}
`

writeFileSync(outPath, text)
execSync(`yarn prettier --write ${outPath}`)
execSync(`yarn eslint ${outPath}`)
