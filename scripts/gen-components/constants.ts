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

export const PRETTIER_CONFIG: prettier.Options = {
  parser: 'typescript',
  semi: false,
  trailingComma: 'es5',
  singleQuote: true,
  tabWidth: 2,
  printWidth: 120,
}

export const OUT_DIR = path.resolve(__dirname, '../../src/components')
export const TYPE_OUT_FILE = path.resolve(OUT_DIR, 'types.ts')
export const COMPONENT_OUT_FILE = path.resolve(OUT_DIR, 'index.ts')
export const BASE_TYPES_FILE = path.resolve(__dirname, 'source/types.ts')

export const RESERVED_TAGS = ['audio', 'line', 'path']
export const CLASS_NODE_MAP: Record<string, string> = {
  Object3D: 'Object3DNode',
  Geometry: 'GeometryNode',
  Material: 'MaterialNode',
  Light: 'LightNode',
}
export const DEFAULT_NODE = 'Node'
