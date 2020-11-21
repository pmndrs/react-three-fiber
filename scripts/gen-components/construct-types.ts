import * as ts from 'typescript'
import { CLASS_NODE_MAP, DEFAULT_NODE, RESERVED_TAGS } from './constants'
import { ExtendsMap, ClassInfo, TypeParam } from './types'
import { toCamelCase } from './utils'

const prefixTypeName = (threeExportNames: readonly string[], typeName: string): string =>
  threeExportNames.includes(typeName) ? `THREE.${typeName}` : typeName

const prefixTypes = (threeExportNames: readonly string[], node: ts.TypeNode): string => {
  if (ts.isTypeReferenceNode(node)) {
    return prefixTypeName(threeExportNames, node.typeName.getText().trim())
  }

  if (ts.isUnionTypeNode(node)) {
    return node.types.map((child) => prefixTypes(threeExportNames, child)).join(' | ')
  }

  if (ts.isArrayTypeNode(node)) {
    return `${prefixTypes(threeExportNames, node.elementType)}[]`
  }

  throw new Error(`We do not currently handle "${ts.SyntaxKind[node.kind]}" nodes`)
}

const createTypeParams = (threeExportNames: readonly string[], params: undefined | readonly TypeParam[]): string => {
  if (!params?.length) {
    return ''
  }

  return `<${params.map((param) => prefixTypeName(threeExportNames, param.name))}>`
}

const createTypeParamsWithExtendsAndDefault = (
  threeExportNames: readonly string[],
  params: undefined | readonly TypeParam[]
): string => {
  if (!params?.length) {
    return ''
  }

  return `<${params.map((param) => {
    const defaultType = param.default ?? param.constraint

    if (!defaultType) {
      throw new Error(`Could not get default type for type param "${param.name}"`)
    }

    const constraint = param.constraint ? ` extends ${prefixTypes(threeExportNames, param.constraint)}` : ''
    const paramName = prefixTypeName(threeExportNames, param.name)
    const defaultTypeText = ` = ${prefixTypes(threeExportNames, defaultType)}`

    return `${paramName}${constraint}${defaultTypeText}`
  })}>`
}

const getBaseExtendedType = (extendsMap: ExtendsMap, extended: undefined | null | string): string | null => {
  if (!extended) {
    return null
  }

  if (extended in CLASS_NODE_MAP) {
    return CLASS_NODE_MAP[extended]
  }

  return getBaseExtendedType(extendsMap, extendsMap[extended])
}

const createExtendedType = (threeExportNames: readonly string[], extendsMap: ExtendsMap, classInfo: ClassInfo) => {
  const refArgs = createTypeParams(threeExportNames, classInfo.params)
  const ref = `${prefixTypeName(threeExportNames, classInfo.name)}${refArgs}`

  if (classInfo.name in CLASS_NODE_MAP) {
    return `${CLASS_NODE_MAP[classInfo.name]}<${ref}, typeof THREE.${classInfo.name}>`
  }

  const baseExtendedName = getBaseExtendedType(extendsMap, classInfo.extended)

  if (!baseExtendedName) {
    return `${DEFAULT_NODE}<${ref}, typeof THREE.${classInfo.name}>`
  }

  return `${baseExtendedName}<${ref}, typeof THREE.${classInfo.name}>`
}

const createDeprecatedComment = (classInfo: ClassInfo) => {
  if (!classInfo.deprecated) {
    return ''
  }

  return `
  /**
   * @deprecated ${classInfo.name} is deprecated in THREE
   */
  `
}

export const createClassTypes = (
  threeExportNames: readonly string[],
  extendsMap: ExtendsMap,
  classInfos: readonly ClassInfo[]
) =>
  classInfos
    .map((classInfo) => {
      const extendedType = createExtendedType(threeExportNames, extendsMap, classInfo)
      const deprecatedComment = createDeprecatedComment(classInfo)
      const typeParams = createTypeParamsWithExtendsAndDefault(threeExportNames, classInfo.params)

      return `${deprecatedComment}export type ${classInfo.name}Props${typeParams} = ${extendedType};`
    })
    .join('\n')

export const createIntrinsicElementKeys = (classInfos: readonly ClassInfo[]) =>
  classInfos
    .map((classInfo) => {
      const camelName = toCamelCase(classInfo.name)
      const commentOut = RESERVED_TAGS.includes(camelName)
        ? `// This clashes with React's intrinsic elements, but you can use the ${classInfo.name} component from react-three-fiber/components\n// `
        : ''

      return `${commentOut}${camelName}: ${classInfo.name}Props;`
    })
    .join('\n')

export const createComponents = (threeExportNames: readonly string[], classInfos: readonly ClassInfo[]) =>
  classInfos
    .map((classInfo) => {
      const camelName = toCamelCase(classInfo.name)
      const deprecatedComment = createDeprecatedComment(classInfo)
      const typeParams = createTypeParamsWithExtendsAndDefault(threeExportNames, classInfo.params)
      const typeArgs = createTypeParams(threeExportNames, classInfo.params)

      return `${deprecatedComment}export const ${classInfo.name} = ('${camelName}' as any) as ${typeParams}(props: ReactThreeFiber.${classInfo.name}Props${typeArgs}) => JSX.Element;`
    })
    .join('\n')
