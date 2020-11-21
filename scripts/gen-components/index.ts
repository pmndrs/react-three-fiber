import * as fs from 'fs'
import * as prettier from 'prettier'

import {
  TYPE_OUT_FILE,
  UTF8,
  BASE_TYPES_FILE,
  BASE_COMPONENTS_FILE,
  PRETTIER_CONFIG,
  COMPONENT_OUT_FILE,
} from './constants'
import { createExtendsMap, extractClassesInfo } from './extract-types'
import { createProgramForModule, typeCheckResults } from './program'
import { createClassTypes, createComponents, createIntrinsicElementKeys } from './construct-types'

const init = () => {
  const { typeChecker, symbol } = createProgramForModule('three')

  const threeExports = typeChecker.getExportsOfModule(symbol)
  const threeExportNames = threeExports.map((threeExport) => threeExport.name)
  const classesInfo = extractClassesInfo(threeExports)
  const extendsMap = createExtendsMap(classesInfo)
  const classOutput = createClassTypes(threeExportNames, extendsMap, classesInfo)
  const intrinsicElementKeys = createIntrinsicElementKeys(classesInfo)
  const components = createComponents(threeExportNames, classesInfo)

  const intrinsicElements = `
  declare global {
    namespace JSX {
      interface IntrinsicElements {
        ${intrinsicElementKeys}
      }
    }
  }
  `

  const typeOutput = `
  // These values were automatically generated. Do not manually edit this file.
  // See scripts/gen-components/
  ${fs.readFileSync(BASE_TYPES_FILE, UTF8)}

  // Automatically generated
  ${classOutput}

  ${intrinsicElements}
  `

  const componentOutput = `
  // These values were automatically generated. Do not manually edit this file.
  // See scripts/gen-components/

  ${fs.readFileSync(BASE_COMPONENTS_FILE, UTF8)}

  // Automatically generated
  ${components}
  `

  fs.writeFileSync(TYPE_OUT_FILE, prettier.format(typeOutput, PRETTIER_CONFIG), UTF8)
  fs.writeFileSync(COMPONENT_OUT_FILE, prettier.format(componentOutput, PRETTIER_CONFIG), UTF8)

  typeCheckResults()
}

init()
