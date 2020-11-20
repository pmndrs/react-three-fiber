import * as ts from 'typescript'

export interface TypeParam {
  name: string
  constraint?: ts.TypeNode
  default?: ts.TypeNode
}

export interface ClassInfo {
  name: string
  params: TypeParam[] | undefined
  extended: string | undefined
  deprecated: boolean
}

export type ExtendsMap = Record<string, string | null>
