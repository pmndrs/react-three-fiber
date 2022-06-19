import { MutableRefObject } from 'react'
import { StoreApi, UseBoundStore } from 'zustand'
import { RootState } from './store'

export interface UpdateCallback {
  (state: RootState, delta: number, frame?: THREE.XRFrame | undefined): void
}

export type UpdateCallbackRef = MutableRefObject<UpdateCallback>
type Store = UseBoundStore<RootState, StoreApi<RootState>>
export type UpdateSubscription = { ref: UpdateCallbackRef; store: Store }

export type FixedStageOptions = { fixedStep?: number; maxSubsteps?: number }
export type FixedStageProps = { fixedStep: number; maxSubsteps: number; accumulator: number; alpha: number }

/**
 * Class representing a stage that updates every frame.
 * Stages are used to build a lifecycle of effects for an app's frameloop.
 */
export class Stage {
  private subscribers: UpdateSubscription[]
  private _delta: number

  constructor() {
    this.subscribers = []
    this._delta = 0
  }

  /**
   * Executes all callback subscriptions on the stage.
   * @param {number} delta - Delta time between frame calls.
   * @param {THREE.XRFrame | undefined} [frame] - The XR frame if it exists.
   */
  frame(delta: number, frame?: THREE.XRFrame | undefined) {
    const subs = this.subscribers
    const initialTime = performance.now()

    for (let i = 0; i < subs.length; i++) {
      subs[i].ref.current(subs[i].store.getState(), delta, frame)
    }

    this._delta = performance.now() - initialTime
  }

  /**
   * Adds a callback subscriber to the stage.
   * @param {UpdateCallbackRef} ref - The mutable callback reference.
   * @param {Store} store - The store to be used with the callback execution.
   * @returns {() => void} A function to remove the subscription.
   */
  add(ref: UpdateCallbackRef, store: Store) {
    this.subscribers.push({ ref, store })

    return () => {
      this.subscribers = this.subscribers.filter((sub) => {
        return sub.ref !== ref
      })
    }
  }

  get delta() {
    return this._delta
  }
}

// Using Unity's fixedStep default.
const FPS_50 = 1 / 50

/**
 * Class representing a stage that updates every frame at a fixed rate.
 * @param {string} name - Name of the stage.
 * @param {number} [fixedStep] - Fixed step rate.
 * @param {number} [maxSubsteps] - Maximum number of substeps.
 * @extends Stage
 */
export class FixedStage extends Stage {
  private _fixedStep: number
  private _maxSubsteps: number
  private _accumulator: number
  private _alpha: number
  private _fixedDelta: number
  private _substepDelta: number[]

  constructor(fixedStep?: number, maxSubSteps?: number) {
    super()

    this._fixedStep = fixedStep ?? FPS_50
    this._maxSubsteps = maxSubSteps ?? 6
    this._accumulator = 0
    this._alpha = 0
    this._fixedDelta = 0
    this._substepDelta = []
  }

  /**
   * Executes all callback subscriptions on the stage.
   * @param {number} delta - Delta time between frame calls.
   * @param {THREE.XRFrame | undefined} [frame] - The XR frame if it exists.
   */
  frame(delta: number, frame?: THREE.XRFrame | undefined) {
    const initialTime = performance.now()
    let substeps = 0
    this._substepDelta = []

    this._accumulator += delta

    while (this._accumulator >= this._fixedStep && substeps < this._maxSubsteps) {
      this._accumulator -= this._fixedStep
      substeps++

      super.frame(this._fixedStep, frame)
      this._substepDelta.push(super.delta)
    }

    this._fixedDelta = performance.now() - initialTime

    // The accumulator will only be larger than the fixed step if we had to
    // bail early due to hitting the max substep limit or execution time lagging.
    // In that case, we want to shave off the excess so we don't fall behind next frame.
    this._accumulator = this._accumulator % this._fixedStep
    this._alpha = this._accumulator / this._fixedStep
  }

  get delta() {
    return this._fixedDelta
  }

  get substepDelta() {
    return this._substepDelta
  }

  get fixedStep() {
    return this._fixedStep
  }

  set fixedStep(fixedStep: number) {
    this._fixedStep = fixedStep
  }

  get maxSubsteps() {
    return this._maxSubsteps
  }

  set maxSubsteps(maxSubsteps: number) {
    this._maxSubsteps = maxSubsteps
  }

  get accumulator() {
    return this._accumulator
  }

  get alpha() {
    return this._alpha
  }
}

const Early = new Stage()
const Fixed = new FixedStage()
const Update = new Stage()
const Late = new Stage()
const Render = new Stage()
const After = new Stage()

export const Stages = { Early, Fixed, Update, Late, Render, After }
export const Lifecycle = [Early, Fixed, Update, Late, Render, After]
