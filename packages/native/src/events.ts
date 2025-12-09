/**
 * @fileoverview Native touch event handling
 *
 * Creates touch event handlers for React Native gesture events.
 * Re-exports web events for compatibility since the actual event
 * translation happens in Canvas via PanResponder.
 */

// Re-export from fiber - the actual touch handling is done in Canvas.tsx
// via PanResponder which translates to pointer events
export { createPointerEvents as createTouchEvents } from '@react-three/fiber'
