import type * as THREE from 'three'
import type * as React from 'react'

//* Utility Types ==============================

export type NonFunctionKeys<P> = { [K in keyof P]-?: P[K] extends Function ? never : K }[keyof P]
export type Overwrite<P, O> = Omit<P, NonFunctionKeys<O>> & O
export type Properties<T> = Pick<T, NonFunctionKeys<T>>
export type Mutable<P> = { [K in keyof P]: P[K] | Readonly<P[K]> }
export type IsOptional<T> = undefined extends T ? true : false
export type IsAllOptional<T extends any[]> = T extends [infer First, ...infer Rest]
  ? IsOptional<First> extends true
    ? IsAllOptional<Rest>
    : false
  : true

//* Camera Types ==============================

export type ThreeCamera = (THREE.OrthographicCamera | THREE.PerspectiveCamera) & { manual?: boolean }

//* Act Type ==============================

export type Act = <T = any>(cb: () => Promise<T>) => Promise<T>

//* Bridge & Block Types ==============================

export type Bridge = React.FC<{ children?: React.ReactNode }>

export type SetBlock = false | Promise<null> | null
export type UnblockProps = { set: React.Dispatch<React.SetStateAction<SetBlock>>; children: React.ReactNode }

//* Object Map Type ==============================

/* Original version
export interface ObjectMap {
  nodes: { [name: string]: THREE.Object3D }
  materials: { [name: string]: THREE.Material }
  meshes: { [name: string]: THREE.Mesh }
}
*/
/* This version is an expansion found in a PR by itsdouges that seems abandoned but looks useful.
It allows expansion but falls back to the original shape. (deleted due to stale, but If it doesnt conflict
I will keep the use here)
https://github.com/pmndrs/react-three-fiber/commits/generic-object-map/
His description is:
The object map type is now generic and can optionally declare the available properties for nodes, materials, and meshes.
*/
export interface ObjectMap<
  T extends { nodes?: string; materials?: string; meshes?: string } = {
    nodes: string
    materials: string
    meshes: string
  },
> {
  nodes: Record<T['nodes'] extends string ? T['nodes'] : string, THREE.Object3D>
  materials: Record<T['materials'] extends string ? T['materials'] : string, THREE.Material>
  meshes: Record<T['meshes'] extends string ? T['meshes'] : string, THREE.Mesh>
}

//* Equality Config ==============================

export interface EquConfig {
  /** Compare arrays by reference equality a === b (default), or by shallow equality */
  arrays?: 'reference' | 'shallow'
  /** Compare objects by reference equality a === b (default), or by shallow equality */
  objects?: 'reference' | 'shallow'
  /** If true the keys in both a and b must match 1:1 (default), if false a's keys must intersect b's */
  strict?: boolean
}

//* Disposable Type ==============================

export interface Disposable {
  type?: string
  dispose?: () => void
}
