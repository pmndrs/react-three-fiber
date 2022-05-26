import { MutableRefObject } from 'react'
import { StoreApi, UseBoundStore } from 'zustand'
import { RootState } from './store'

export interface UpdateCallback {
  (state: RootState, delta: number, frame?: THREE.XRFrame | undefined): void
}

export type UpdateCallbackRef = MutableRefObject<UpdateCallback>
type Store = UseBoundStore<RootState, StoreApi<RootState>>
export type UpdateSubscription = { ref: UpdateCallbackRef; store: Store }

export type FixedStageOptions = { fixedStep?: number; maxSubSteps?: number }

export class Stage {
  name: string
  subscribers: UpdateSubscription[]

  constructor(name: string) {
    this.name = name
    this.subscribers = []
  }

  frame(delta: number, frame?: THREE.XRFrame | undefined) {
    const subs = this.subscribers

    for (let i = 0; i < subs.length; i++) {
      subs[i].ref.current(subs[i].store.getState(), delta, frame)
    }
  }

  add(ref: UpdateCallbackRef, store: Store) {
    this.subscribers = [...this.subscribers, { ref, store }]

    return () => {
      this.subscribers = this.subscribers.filter((sub) => {
        return sub.ref !== ref
      })
    }
  }
}

const FPS_50 = 1 / 50

export class FixedStage extends Stage {
  private fixedStep: number
  private maxSubsteps: number
  private accumulator: number
  private alpha: number

  constructor(name: string, options?: { fixedStep?: number; maxSubSteps?: number }) {
    super(name)

    this.fixedStep = options?.fixedStep ?? FPS_50
    this.maxSubsteps = options?.maxSubSteps ?? 6
    this.accumulator = 0
    this.alpha = 0
  }

  frame(delta: number, frame?: THREE.XRFrame | undefined) {
    const initialTime = performance.now()
    let substeps = 0

    this.accumulator += delta

    while (this.accumulator >= this.fixedStep && substeps < this.maxSubsteps) {
      this.accumulator -= this.fixedStep
      substeps++

      super.frame(this.fixedStep, frame)

      if (performance.now() - initialTime > this.fixedStep * 1000) {
        // The framerate is not interactive anymore. Better bail out.
        break
      }
    }
    // If the this.accumulator is bigger than delta, set it to 1.
    // It should never be bigger than delta unless something went wrong.
    this.accumulator = this.accumulator % this.fixedStep
    this.alpha = this.accumulator / this.fixedStep
  }

  set(options: FixedStageOptions) {
    const { fixedStep, maxSubSteps } = options
    if (fixedStep) this.fixedStep = fixedStep
    if (maxSubSteps) this.maxSubsteps = maxSubSteps
  }

  get() {
    return {
      fixedStep: this.fixedStep,
      maxSubsteps: this.maxSubsteps,
      accumulator: this.accumulator,
      alpha: this.alpha,
    }
  }
}

const Early = new Stage('early')
const Fixed = new FixedStage('fixed')
const Update = new Stage('update')
const Late = new Stage('late')
const Render = new Stage('render')
const After = new Stage('after')

export const Standard = { Early, Fixed, Update, Late, Render, After }
export const StandardPipeline = [Early, Fixed, Update, Late, Render, After]
