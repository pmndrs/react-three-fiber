import * as fs from 'fs'
import * as path from 'path'
import * as ts from 'typescript'
import * as prettier from 'prettier'

export const UTF8 = 'utf8'

export const COMPILER_OPTIONS: ts.CompilerOptions = {
  strict: true,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  noImplicitAny: true,
  noUnusedParameters: true,
  noUnusedLocals: true,
  noEmitOnError: true,
  noImplicitReturns: true,
}

const prettierrcContent = fs.readFileSync(path.resolve(__dirname, '../../.prettierrc'), UTF8)

let prettierJson: Record<string, any> | undefined

try {
  prettierJson = JSON.parse(prettierrcContent)
} catch (error) {
  console.error(error)
  throw new Error('Failed to parse .prettierrc to JSON')
}

export const PRETTIER_CONFIG: prettier.Options = {
  parser: 'typescript',
  ...prettierJson,
}

export const OUT_DIR = path.resolve(__dirname, '../../src/components')
export const TYPE_OUT_FILE = path.resolve(OUT_DIR, 'types.ts')
export const COMPONENT_OUT_FILE = path.resolve(OUT_DIR, 'index.ts')
export const BASE_TYPES_FILE = path.resolve(__dirname, 'source/types.ts')
export const BASE_COMPONENTS_FILE = path.resolve(__dirname, 'source/index.ts')

export const RESERVED_TAGS = ['audio', 'line', 'path']
export const CLASS_NODE_MAP: Record<string, string> = {
  Object3D: 'Object3DNode',
  Geometry: 'GeometryNode',
  Material: 'MaterialNode',
  Light: 'LightNode',
}
export const DEFAULT_NODE = 'Node'
