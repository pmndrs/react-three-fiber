---
name: WebGPU Test Infrastructure
overview: Update test-renderer and test suite to support the new WebGL/WebGPU architecture with proper deprecation warning handling and configurable renderer selection.
todos:
  - id: update-test-renderer-types
    content: Add renderer option to CreateOptions and update test-renderer to support both WebGL and WebGPU
    status: completed
  - id: setup-warning-mocks
    content: Create test utilities for mocking and managing console.warn for deprecation warnings
    status: completed
  - id: add-deprecation-tests
    content: Create new test file for deprecation warning behavior across all import variants
    status: completed
  - id: add-renderer-variant-tests
    content: Create tests to verify each import path (default, legacy, webgpu) works correctly
    status: completed
  - id: update-existing-tests
    content: Update existing fiber and test-renderer tests to handle warnings or use legacy imports
    status: completed
  - id: update-test-renderer-tests
    content: Add test cases for renderer selection in RTTR tests
    status: completed
  - id: verify-ci-pipeline
    content: Ensure all tests pass in CI/CD with the new setup
    status: completed
---

# WebGPU Test Infrastructure Update Plan

## Overview

Update the test renderer and test suite to support both WebGL (legacy) and WebGPU renderers, with proper handling of deprecation warnings and comprehensive test coverage for the new import paths.

## Current State Analysis

The r3f platform now has three import paths:

- **Default** (`@react-three/fiber`): Exports both renderers, uses WebGL by default with deprecation warning
- **Legacy** (`@react-three/fiber/legacy`): WebGL only, no warnings (R3F_BUILD_LEGACY=true, R3F_BUILD_WEBGPU=false)
- **WebGPU** (`@react-three/fiber/webgpu`): WebGPU only, includes TSL hooks (R3F_BUILD_LEGACY=false, R3F_BUILD_WEBGPU=true)

The deprecation logic in `packages/fiber/src/core/renderer.tsx` (lines 206-212) triggers when:

- Both build flags are true (default build)
- Not marked as legacy (`!state.isLegacy`)
- Using WebGL renderer (`wantsGL`)

## Implementation Strategy

### 1. Update Test Renderer Core (`packages/test-renderer/`)

**File: `src/index.tsx`**

- Add `renderer` option to `CreateOptions` type
- Pass `renderer` config to `createRoot().configure()`
- Allow tests to specify which renderer to use

**File: `src/types/public.ts`**

- Extend `CreateOptions` to include `renderer?: 'webgl' | 'webgpu' | 'auto'`
- Default to `'webgl'` for backwards compatibility (no warnings in tests by default)

**File: `src/createTestCanvas.ts`**

- Mock WebGPU context support if needed
- Ensure canvas mock supports both WebGL and WebGPU contexts

### 2. Update Shared Test Setup (`packages/shared/setupTests.ts`)

- Mock `console.warn` globally with jest spy
- Store original console methods
- Add helper to suppress/restore warnings per test
- Clear mock between tests

### 3. Update Existing Fiber Tests

**File: `packages/fiber/tests/renderer.test.tsx`**

- Add test suite for deprecation warnings
- Test that default import with no renderer prop shows warning
- Test that legacy import never shows warning
- Test that webgpu import doesn't require renderer prop
- Test that passing `renderer` prop on default import switches to WebGPU without warning

**File: `packages/fiber/tests/canvas.test.tsx`**

- Update to use legacy import or suppress warnings
- Add specific tests for Canvas with different renderers

**File: `packages/fiber/tests/hooks.test.tsx`**

- Update imports to use legacy or add warning suppression
- Keep existing tests focused on hook behavior

**File: `packages/fiber/tests/index.test.tsx`**

- Update to handle renderer variants
- Add tests for build flag validation

### 4. Update Test-Renderer Tests

**File: `packages/test-renderer/src/__tests__/RTTR.core.test.tsx`**

- Add test cases for renderer option
- Test WebGL renderer (default)
- Test WebGPU renderer (explicit)
- Verify no warnings when using explicit renderer selection

**File: `packages/test-renderer/src/__tests__/RTTR.hooks.test.tsx`**

- Keep existing hook tests with legacy mode
- Add notes about WebGPU-specific hooks (for future)

### 5. New Test Files

**File: `packages/fiber/tests/deprecation.test.tsx`**

```typescript
// Test deprecation warning behavior
- Default import without renderer → shows warning once
- Default import with renderer="webgpu" → no warning
- Legacy import → never warns
- WebGPU import → never warns (no WebGL available)
- Warning only shows once per session
```

**File: `packages/fiber/tests/renderer-variants.test.tsx`**

```typescript
// Test all three import variants work correctly
- Test from '@react-three/fiber'
- Test from '@react-three/fiber/legacy'
- Test from '@react-three/fiber/webgpu'
- Verify build flags are correct for each
- Verify correct renderer is used
```

**File: `packages/test-renderer/src/__tests__/RTTR.renderers.test.tsx`**

```typescript
// Test renderer selection in test-renderer
- Test with renderer: 'webgl'
- Test with renderer: 'webgpu'
- Test with renderer: 'auto' (uses default)
- Test legacy compatibility
```

## Testing Utilities

**New File: `packages/shared/testUtils.ts`**

```typescript
export const suppressDeprecationWarnings = () => {
  const original = console.warn
  beforeEach(() => {
    console.warn = jest.fn()
  })
  afterEach(() => {
    console.warn = original
  })
}

export const expectDeprecationWarning = (heading: string) => {
  expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(heading), expect.any(String))
}

export const clearDeprecationNotices = () => {
  // Reset the shownNotices Set in notices.ts
  // May need to export a reset function
}
```

## Key Testing Scenarios

### Scenario 1: Default Import Behavior

```typescript
import { Canvas } from '@react-three/fiber'
// Should show deprecation warning on first render with WebGL
```

### Scenario 2: Legacy Import (No Warning)

```typescript
import { Canvas } from '@react-three/fiber/legacy'
// Should never show deprecation warning
```

### Scenario 3: WebGPU Import

```typescript
import { Canvas } from '@react-three/fiber/webgpu'
// Should work without renderer prop, no warnings
```

### Scenario 4: Explicit Renderer Selection

```typescript
import { Canvas } from '@react-three/fiber'
// <Canvas renderer={...webgpu config...} />
// Should use WebGPU, no deprecation warning
```

## Migration Notes for Existing Tests

Most existing tests should:

1. Import from `@react-three/fiber/legacy` to avoid warnings
2. OR use the test utility to suppress warnings
3. Add explicit tests for the new behavior in dedicated test files

## Future Considerations (Not in this phase)

- Tests for WebGPU-specific hooks: `useUniforms`, `useNodes`, `useTextures`
- TSL (Three Shading Language) integration tests
- Performance comparison tests
- WebGPU feature detection and graceful fallback tests
- Compute shader testing infrastructure

## Success Criteria

✅ Test renderer can create both WebGL and WebGPU renderers

✅ Deprecation warnings are properly tested

✅ All existing tests pass without spurious warnings

✅ New tests verify correct renderer is used for each import

✅ Build flags are correctly set for each variant

✅ CI/CD pipeline passes with updated tests
