//* Scheduler Types (useFrame) ==============================
//
// The generic, framework-agnostic scheduler types now live in @pmndrs/scheduler.
// This file re-exports them and layers r3f's RootState-aware frame state on top,
// so existing `#types` imports across the codebase keep resolving unchanged.

import type { RootState } from './store'
import type {
  FrameCallback as SchedulerFrameCallback,
  FrameTimingState as SchedulerFrameTimingState,
} from '@pmndrs/scheduler'

// Re-export the generic public types (single source of truth: @pmndrs/scheduler)
export type {
  UseFrameOptions,
  UseFrameNextOptions,
  AddPhaseOptions,
  RootOptions,
  SchedulerApi,
  FrameTimingState,
  FrameControls,
  FrameNextControls,
} from '@pmndrs/scheduler'

// Frame State (r3f-specific) --------------------------------

/**
 * State passed to useFrame callbacks (extends RootState with timing).
 */
export interface FrameNextState extends RootState, SchedulerFrameTimingState {}

/** Alias for FrameNextState */
export type FrameState = FrameNextState

// Callback Types (r3f-specific) --------------------------------

/**
 * Callback function for useFrame. Receives the full r3f RootState plus timing.
 */
export type FrameNextCallback = SchedulerFrameCallback<RootState>

/** Alias for FrameNextCallback */
export type FrameCallback = FrameNextCallback
