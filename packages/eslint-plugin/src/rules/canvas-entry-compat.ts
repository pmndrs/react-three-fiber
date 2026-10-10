import type { Rule } from 'eslint'
import { mergeListeners } from '../lib/ast'
import { type FiberEntry, trackFiberImports, WEBGPU_ENTRIES } from '../lib/imports'
import {
  attributes,
  attributeValue,
  elementName,
  isIntrinsic,
  isSet,
  type JSXOpeningElement,
  onOpeningElement,
} from '../lib/jsx'
import { gitHubUrl } from '../lib/url'

const NODE_MATERIAL = /NodeMaterial$/
const GLSL_MATERIALS = new Set(['shaderMaterial', 'rawShaderMaterial'])
const OCCLUSION_EVENTS = new Set(['onOccluded', 'onVisible'])

const ENTRY_NAME: Record<FiberEntry, string> = {
  default: '@react-three/fiber',
  legacy: '@react-three/fiber/legacy',
  webgpu: '@react-three/fiber/webgpu',
  extension: '@react-three/fiber/extension',
  native: '@react-three/fiber/native',
}

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    messages: {
      glOnWebGPU:
        'The `gl` prop configures WebGLRenderer, but a Canvas from {{entry}} renders with WebGPU, so this throws. ' +
        'Move these settings to `renderer`, or import Canvas from @react-three/fiber/legacy to stay on WebGL.',
      rendererOnLegacy:
        'The `renderer` prop configures WebGPURenderer, which @react-three/fiber/legacy does not have, so this throws. ' +
        'Use `gl` for WebGL settings, or import Canvas from @react-three/fiber for WebGPU.',
      glAndRenderer: '`gl` and `renderer` cannot be used together; this throws. Keep the one that matches the entry.',
      webgpuOnlyProp:
        '`{{prop}}` shares a WebGPU renderer, which @react-three/fiber/legacy does not have, so this throws.',
      primaryWithShare:
        'A <Canvas primary> owns its renderer, so `share="{{share}}"` on it throws. Remove one of the two.',
      nodeMaterialOnLegacy:
        '<{{name}}> is a node material, which WebGLRenderer cannot compile, and this file renders with a Canvas from ' +
        '@react-three/fiber/legacy, so this throws. Use a Canvas from @react-three/fiber for node materials.',
      glslOnWebGPU:
        '<{{name}}> is a GLSL material, which WebGPURenderer cannot compile: it draws a blank default material instead. ' +
        'This file renders with a Canvas from {{entry}}; import Canvas from @react-three/fiber/legacy for GLSL, or port ' +
        'the shader to a node material.',
      occlusionOnLegacy:
        '`{{prop}}` needs WebGPU occlusion queries, and this file renders with a Canvas from @react-three/fiber/legacy, ' +
        'so it never fires.',
    },
    docs: {
      url: gitHubUrl('canvas-entry-compat'),
      recommended: true,
      description:
        'Disallow Canvas props, materials and events the Canvas entry does not support, which throw or silently fail.',
    },
    schema: [],
  },
  create(ctx) {
    const imports = trackFiberImports()
    const elements: JSXOpeningElement[] = []

    /** The entry every Canvas in this file comes from, when there is exactly one. */
    const canvasEntry = (): FiberEntry | undefined => {
      const entries = imports.entriesOf('Canvas')
      return entries.size === 1 ? [...entries][0] : undefined
    }

    const checkCanvas = (element: JSXOpeningElement, entry: FiberEntry) => {
      const attrs = attributes(element)
      const gl = attrs.get('gl')
      const renderer = attrs.get('renderer')
      const primary = attrs.get('primary')
      const share = attrs.get('share')
      const webgpu = WEBGPU_ENTRIES.has(entry)
      const report = (node: unknown, messageId: string, data?: Record<string, string>) =>
        ctx.report({ node: node as never, messageId, data })

      if (isSet(gl, { falseIsUnset: true }) && isSet(renderer, { falseIsUnset: true })) {
        report(element, 'glAndRenderer')
      } else if (webgpu && isSet(gl, { falseIsUnset: true })) {
        report(gl, 'glOnWebGPU', { entry: ENTRY_NAME[entry] })
      } else if (entry === 'legacy' && isSet(renderer, { falseIsUnset: true })) {
        report(renderer, 'rendererOnLegacy')
      }

      if (entry === 'legacy') {
        if (isSet(primary, { falseIsUnset: true })) report(primary, 'webgpuOnlyProp', { prop: 'primary' })
        const shareValue = share && attributeValue(share)
        if (shareValue?.kind === 'literal' && typeof shareValue.value === 'string') {
          report(share, 'webgpuOnlyProp', { prop: 'share' })
        }
      } else if (isSet(primary, { falseIsUnset: true }) && share) {
        const shareValue = attributeValue(share)
        if (shareValue.kind === 'literal' && typeof shareValue.value === 'string') {
          report(share, 'primaryWithShare', { share: shareValue.value })
        }
      }
    }

    const checkScene = (element: JSXOpeningElement, entry: FiberEntry) => {
      const name = elementName(element)
      if (!isIntrinsic(name)) return
      if (entry === 'legacy' && NODE_MATERIAL.test(name)) {
        ctx.report({ node: element as never, messageId: 'nodeMaterialOnLegacy', data: { name } })
      }
      if (WEBGPU_ENTRIES.has(entry) && GLSL_MATERIALS.has(name)) {
        ctx.report({ node: element as never, messageId: 'glslOnWebGPU', data: { name, entry: ENTRY_NAME[entry] } })
      }
      if (entry === 'legacy') {
        for (const [prop, attribute] of attributes(element)) {
          if (OCCLUSION_EVENTS.has(prop))
            ctx.report({ node: attribute as never, messageId: 'occlusionOnLegacy', data: { prop } })
        }
      }
    }

    return mergeListeners(imports.listener, {
      JSXOpeningElement: onOpeningElement((element) => {
        elements.push(element)
      }),
      'Program:exit'() {
        const fileEntry = canvasEntry()
        for (const element of elements) {
          const name = elementName(element)
          const imported = name ? imports.get(name) : undefined
          if (imported?.imported === 'Canvas') checkCanvas(element, imported.entry)
          // A file-wide check: it only knows the renderer when the file renders its own Canvas
          else if (fileEntry) checkScene(element, fileEntry)
        }
      },
    })
  },
}

export default rule
