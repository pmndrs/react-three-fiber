import React from 'react'
import * as ts from 'typescript'
import { join } from 'path'
import { readFileSync } from 'fs'
import * as THREE from 'three'
import TestRenderer from 'react-test-renderer'

import { components as t } from '.'

describe('components', () => {
  test('mesh example matches snapshot', () => {
    expect(
      TestRenderer.create(
        <t.Mesh
          onUpdate={mesh => console.log(mesh.geometry)}
          onClick={() => console.log('click')}
          onPointerOver={() => console.log('hover')}
          onPointerOut={() => console.log('unhover')}>
          <t.BoxBufferGeometry attach="geometry" args={[1, 1, 1]} />
          <t.MeshNormalMaterial attach="material" />
        </t.Mesh>
      )
    ).toMatchSnapshot()
  })

  test('components.Line can be used instead of line instrinsic element', () => {
    const actual = TestRenderer.create(<t.Line />).toJSON()
    const expected = TestRenderer.create(<line />).toJSON()
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(actual).toStrictEqual(expected!)
  })

  test('all properties of ThreeFiberComponents type can be found in components dict', () => {
    const filePath = join(__dirname, '/components.tsx')
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
    const program = ts.createProgram([filePath], {
      ...options,
      baseUrl: '..',
      jsx: ts.JsxEmit.React,
    })

    const sourceFile = program.getSourceFile(filePath)
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

    const componentNamesFromType = visit(sourceFile, node => {
      if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
        const declaration = node as ts.InterfaceDeclaration

        if (declaration.name.escapedText === 'ThreeFiberComponents') {
          return typeChecker
            .getTypeAtLocation(declaration)
            .getProperties()
            .map(symbol => symbol.escapedName)
        }
      }
      return []
    })

    expect(componentNamesFromType.length).toBeGreaterThan(0)

    const missingInThree = componentNamesFromType.filter(componentName => !THREE[componentName as keyof typeof THREE])

    // see MissingInThreeRuntimeExports in components.tsx
    expect(missingInThree.sort()).toStrictEqual(
      [
        'AnimationAction',
        'DirectGeometry',
        'WebGLClipping',
        'WebGLInfo',
        'WebGLProperties',
        'WebGLRenderList',
        'WebGLRenderLists',
        'WebGLColorBuffer',
        'WebGLDepthBuffer',
        'WebGLStencilBuffer',
      ].sort()
    )
  })
})
