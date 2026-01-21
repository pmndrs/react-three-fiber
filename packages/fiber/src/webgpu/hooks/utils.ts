import type { StoreApi } from 'zustand'
import * as THREE from '#three'
import { RootState } from '../../../types/store'

//* Map Utilities for Textures ==============================
// Textures use Map<string, T> since URLs work better as Map keys

/**
 * Add a single texture to the Map
 */
export function addTexture(set: StoreApi<RootState>['setState'], key: string, value: any) {
  set((state) => {
    const newMap = new Map(state.textures)
    newMap.set(key, value)
    return { textures: newMap }
  })
}

/**
 * Add multiple textures to the Map
 */
export function addTextures(set: StoreApi<RootState>['setState'], items: Map<string, any> | Record<string, any>) {
  set((state) => {
    const newMap = new Map(state.textures)
    const entries = items instanceof Map ? items.entries() : Object.entries(items)
    for (const [key, value] of entries) {
      newMap.set(key, value)
    }
    return { textures: newMap }
  })
}

/**
 * Remove a single texture from the Map
 */
export function removeTexture(set: StoreApi<RootState>['setState'], key: string) {
  set((state) => {
    const newMap = new Map(state.textures)
    newMap.delete(key)
    return { textures: newMap }
  })
}

/**
 * Remove multiple textures from the Map
 */
export function removeTextures(set: StoreApi<RootState>['setState'], keys: string[]) {
  set((state) => {
    const newMap = new Map(state.textures)
    for (const key of keys) newMap.delete(key)
    return { textures: newMap }
  })
}

//* Texture Operations Interface ==============================

export interface TextureOperations {
  add: (key: string, value: any) => void
  addMultiple: (items: Map<string, any> | Record<string, any>) => void
  remove: (key: string) => void
  removeMultiple: (keys: string[]) => void
}

export function createTextureOperations(set: StoreApi<RootState>['setState']): TextureOperations {
  return {
    add: (key, value) => addTexture(set, key, value),
    addMultiple: (items) => addTextures(set, items),
    remove: (key) => removeTexture(set, key),
    removeMultiple: (keys) => removeTextures(set, keys),
  }
}

//* TSL Node Value Extraction ==============================
// Extracts actual values from TSL ConstNodes (color(), vec3(), float(), etc.)
// This mirrors what Three.js's uniform() function does internally.

/**
 * Extracts the actual value from a TSL ConstNode.
 *
 * When you call `color('red')` or `vec3(1,2,3)`, TSL creates a ConstNode
 * that wraps the actual value. This function extracts that value so it can
 * be used for comparison and uniform creation.
 *
 * This mirrors Three.js's uniform() behavior which traverses nodes to find
 * the concrete value before creating the UniformNode.
 *
 * @param value - Any value, potentially a TSL node
 * @returns The extracted value if it's a TSL ConstNode, otherwise the original value
 *
 * @example
 * extractTSLValue(color('red')) // => THREE.Color
 * extractTSLValue(vec3(1, 2, 3)) // => THREE.Vector3
 * extractTSLValue(float(1.5)) // => 1.5
 * extractTSLValue(new THREE.Color('red')) // => THREE.Color (unchanged)
 * extractTSLValue(5) // => 5 (unchanged)
 */
export function extractTSLValue(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value

  const node = value as any

  // Check if it's a TSL Node (has isNode flag like Three.js checks)
  if (!node.isNode) return value

  // For ConstNodes, extract the value directly
  if (node.isConstNode) {
    return node.value
  }

  // For other nodes with a value, try to traverse like Three.js uniform() does
  // This handles cases where a node wraps a ConstNode
  if ('value' in node) {
    let extractedValue = node.value

    // Traverse to find ConstNode values (mirrors Three.js uniform() logic)
    if (typeof node.traverse === 'function') {
      node.traverse((n: any) => {
        if (n.isConstNode) {
          extractedValue = n.value
        }
      })
    }

    return extractedValue
  }

  // Not a value-bearing node, return as-is
  return value
}

//* Vectorization Utilities ==============================
// Converts plain objects from Leva (e.g., {x: 1, y: 2}) to Three.js vectors

/**
 * Converts plain objects with x/y/z/w properties to Three.js Vector types.
 * Also converts color strings (hex, named, rgb) to Three.js Color.
 * Extracts values from TSL ConstNodes (color(), vec3(), etc.).
 * Handles Leva's output format while preserving existing Three.js types.
 *
 * @param inObject - Input value (can be number, vector, matrix, color string, TSL node, plain object, etc.)
 * @returns Three.js Vector/Color if convertible, extracted value if TSL node, otherwise original value
 *
 * @example
 * vectorize({x: 1, y: 2}) // => Vector2(1, 2)
 * vectorize({x: 1, y: 2, z: 3}) // => Vector3(1, 2, 3)
 * vectorize({x: 1, y: 2, z: 3, w: 4}) // => Vector4(1, 2, 3, 4)
 * vectorize('#ff0a81') // => Color(0xff0a81)
 * vectorize('red') // => Color('red')
 * vectorize(color('red')) // => Color (extracted from TSL node)
 * vectorize(vec3(1, 2, 3)) // => Vector3 (extracted from TSL node)
 * vectorize(new THREE.Vector3(1, 2, 3)) // => Vector3(1, 2, 3) (unchanged)
 * vectorize(5) // => 5 (unchanged)
 */
export function vectorize(inObject: unknown): unknown {
  // Early exit for null/undefined
  if (inObject === null || inObject === undefined) return inObject

  // Handle color strings (from Leva color picker or manual input)
  if (typeof inObject === 'string') {
    // Check if it looks like a color (hex format or named color)
    // Hex: #rgb, #rrggbb, #rrggbbaa, 0xffffff
    // Named: 'red', 'blue', etc. (Three.js Color supports these)
    const isHexColor = /^(#|0x)[0-9a-f]{3,8}$/i.test(inObject)
    const isNamedColor = /^[a-z]+$/i.test(inObject) // Basic check for named colors

    if (isHexColor || isNamedColor) {
      return new THREE.Color(inObject)
    }

    // Not a color, return as-is
    return inObject
  }

  // Early exit for non-objects
  if (typeof inObject !== 'object') return inObject

  const obj = inObject as any

  // If it's a TSL Node (color(), vec3(), etc.), extract the actual value
  // This ensures consistent comparison and prevents uuid mismatches on re-renders
  if (obj.isNode) {
    return extractTSLValue(inObject)
  }

  // If already a Three.js vector, return as-is
  if (obj.isVector2 || obj.isVector3 || obj.isVector4) return inObject

  // If it's a matrix, return as-is
  if (obj.isMatrix3 || obj.isMatrix4) return inObject

  // If it's a Color, Euler, Quaternion, or other Three.js types, return as-is
  if (obj.isColor || obj.isEuler || obj.isQuaternion || obj.isSpherical) return inObject

  // Check if it's a plain object with numeric x/y properties
  if ('x' in obj && 'y' in obj && typeof obj.x === 'number' && typeof obj.y === 'number') {
    // Check for Vector4 (x, y, z, w)
    if ('w' in obj && typeof obj.w === 'number' && 'z' in obj && typeof obj.z === 'number') {
      return new THREE.Vector4(obj.x, obj.y, obj.z, obj.w)
    }

    // Check for Vector3 (x, y, z)
    if ('z' in obj && typeof obj.z === 'number') {
      return new THREE.Vector3(obj.x, obj.y, obj.z)
    }

    // Vector2 (x, y)
    return new THREE.Vector2(obj.x, obj.y)
  }

  // Return original value if no conversion needed
  return inObject
}
