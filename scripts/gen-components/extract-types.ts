import * as ts from 'typescript'
import { ExtendsMap, ClassInfo, TypeParam } from './types'

import { isNotNull } from './utils'

export const extractClassesInfo = (threeExports: readonly ts.Symbol[]) =>
  threeExports
    .map((threeExport) => {
      const declarations = threeExport.getDeclarations()?.filter(ts.isClassDeclaration)

      if (declarations) {
        if (declarations.length === 1) {
          return {
            name: threeExport.name,
            declaration: declarations[0],
          }
        }

        if (declarations.length > 1) {
          throw new Error(
            `Multiple class declarations for "${threeExport.getName()}". I don't know what to do with this.`
          )
        }
      }

      return null
    })
    .filter(isNotNull)
    .map(
      ({ name, declaration }): ClassInfo => {
        const deprecated = Boolean(
          ts.getJSDocTags(declaration).find((jsDocTag) => jsDocTag.tagName.getText().trim() === 'deprecated')
        )

        const params = declaration.typeParameters?.length
          ? declaration.typeParameters.map<TypeParam>((param) => ({
              name: param.name.getText().trim(),
              constraint: param.constraint,
              default: param.default,
            }))
          : undefined

        const extended = declaration.heritageClauses
          ?.filter((heritage) => heritage.token === ts.SyntaxKind.ExtendsKeyword)
          .map((heritage) => {
            const types = heritage.types.map((type) => ({
              name: type.expression.getText().trim(),
              args: type.typeArguments?.map((arg) => arg.getText().trim()),
            }))

            if (!types.length || types.length > 1) {
              console.info(heritage)
              throw new Error('Too few/many types for heritage clause')
            }

            return types[0]
          })

        if (extended && extended.length > 1) {
          throw new Error(`"${name}" extends too many things. We don't currently handle this.`)
        }

        return {
          name,
          params,
          extended: extended?.[0]?.name,
          deprecated,
        }
      }
    )

export const createExtendsMap = (classesInfo: readonly ClassInfo[]) => {
  const extendsMap: ExtendsMap = {}

  classesInfo.forEach(({ name, extended }) => {
    extendsMap[name] = extended ?? null
  })

  return extendsMap
}
