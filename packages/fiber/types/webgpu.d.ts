//* WebGPU Entry Point Types ==============================
// This barrel re-exports all main R3F types plus WebGPU-specific types
// Used when importing from '@react-three/fiber/webgpu'

import type * as THREE from 'three/webgpu'
import type { Node } from 'three/webgpu'
import type { Properties } from './utils'
import type { BaseRendererProps, RendererFactory } from './renderer'
import type { RootState } from './store'

//* Re-export all main R3F types ==============================
export * from './index'

//* WebGPU Renderer Types ==============================

export type WebGPUDefaultProps = Omit<THREE.WebGPURendererParameters, 'canvas'> & BaseRendererProps

export type WebGPUProps =
  | RendererFactory<THREE.WebGPURenderer, WebGPUDefaultProps>
  | Partial<Properties<THREE.WebGPURenderer> | THREE.WebGPURendererParameters>

export interface WebGPUShadowConfig {
  shadows?: boolean
}

//* WebGPU Hook Types ==============================

// TSLNode - alias for Three.js Node
export type TSLNode = Node

// NodeRecord - flat record of TSL nodes
export type NodeRecord<T extends Node = Node> = Record<string, T>

// NodeCreator - function that creates nodes from state
export type NodeCreator<T extends NodeRecord> = (state: RootState) => T

// LocalNodeCreator - for component-scoped nodes (not in global store)
export type LocalNodeCreator<T extends Record<string, unknown>> = (state: RootState) => T

// UniformCreator - function that creates uniforms from state
export type UniformCreator<T extends UniformInputRecord = UniformInputRecord> = (state: RootState) => T

// TextureOperations - returned by createTextureOperations
export interface TextureOperations {
  get: (name: string) => THREE.Texture | undefined
  set: (name: string, texture: THREE.Texture) => void
  remove: (name: string) => boolean
  has: (name: string) => boolean
  clear: () => void
}

//* WebGPU Hook Function Signatures ==============================

// useNodes overloads
export function useNodes(): NodeRecord
export function useNodes(scope: string): NodeRecord
export function useNodes<T extends NodeRecord>(creator: NodeCreator<T>): T
export function useNodes<T extends NodeRecord>(creator: NodeCreator<T>, scope: string): T

// useLocalNodes
export function useLocalNodes<T extends Record<string, unknown>>(creator: LocalNodeCreator<T>): T

// useUniforms overloads
export function useUniforms(): UniformRecord & Record<string, UniformRecord>
export function useUniforms(scope: string): UniformRecord
export function useUniforms<T extends UniformInputRecord>(creator: UniformCreator<T>): UniformRecord<UniformNode>
export function useUniforms<T extends UniformInputRecord>(
  creator: UniformCreator<T>,
  scope: string,
): UniformRecord<UniformNode>

// useUniform
export function useUniform<T extends UniformValue>(name: string, initialValue: T): UniformNode<T>

// usePostProcessing
export function usePostProcessing(creator: (state: RootState) => Record<string, Node>, deps?: unknown[]): void

// Utility functions
export function removeNodes(scope: string): void
export function clearNodeScope(scope: string): void
export function clearRootNodes(): void
export function removeUniforms(scope: string): void
export function clearScope(scope: string): void
export function clearRootUniforms(): void
export function createTextureOperations(state: RootState): TextureOperations
