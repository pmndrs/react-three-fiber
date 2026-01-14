# WebGPU Hooks

React hooks for WebGPU/TSL shader development. **v10+ only.**

## Start Here

- **[Overview](./readmes/overview.md)** - Architecture, concepts, quick start

## API Reference

- **[useUniform](./readmes/useUniform.md)** - Single uniform management
- **[useUniforms](./readmes/useUniforms.md)** - Batch uniforms with scoping
- **[useNodes](./readmes/useNodes.md)** - Global TSL node sharing
- **[useLocalNodes](./readmes/useLocalNodes.md)** - Component-local nodes
- **[usePostProcessing](./readmes/usePostProcessing.md)** - Post-processing setup

## Import

```tsx
import { useUniforms, useNodes, useLocalNodes, usePostProcessing } from '@react-three/fiber/webgpu'
```
