import rule from '../../src/rules/no-creator-side-effects'
import { tester } from '../tester'

tester.run('no-creator-side-effects', rule, {
  valid: [
    // The install form: assignment in the returned function
    `
    useLocalNodes(({ scene, uniforms }) => {
      const fogNode = fog(uniforms.fogColor, rangeFogFactor(uniforms.near, uniforms.far))
      return () => {
        scene.fogNode = fogNode
        return () => { scene.fogNode = null }
      }
    }, [])
  `,
    `useNodes(({ uniforms }) => ({ wobble: sin(uniforms.uTime) }))`,
    `useNodes(({ uniforms }) => { const w = sin(uniforms.uTime); return { wobble: w } })`,
    // Reading the scene is fine
    `useLocalNodes(({ scene }) => ({ bg: scene.backgroundNode }), [])`,
    // Assigning to a local, not to the scene
    `useLocalNodes(({ scene }) => { let s = scene; s = null; return {} }, [])`,
    // A reader call, not a creator
    `useNodes('effects')`,
  ],
  invalid: [
    {
      code: `
        useLocalNodes(({ scene, uniforms }) => {
          scene.fogNode = fog(uniforms.fogColor, uniforms.fogFactor)
          return {}
        }, [])
      `,
      errors: [{ messageId: 'mutation', data: { hook: 'useLocalNodes', key: 'scene' } }],
    },
    {
      code: `
        useNodes(({ scene }) => {
          scene.backgroundNode = color(0x000000)
        })
      `,
      errors: [
        { messageId: 'returnsNothing', data: { hook: 'useNodes' } },
        { messageId: 'mutation', data: { hook: 'useNodes', key: 'scene' } },
      ],
    },
    {
      // A whole-state parameter, a deep member chain, and useUniforms
      code: `
        useUniforms((state) => {
          state.camera.userData.tag = 'x'
          return { uTime: 0 }
        })
      `,
      errors: [{ messageId: 'mutation', data: { hook: 'useUniforms', key: 'camera' } }],
    },
    {
      code: `useLocalNodes(() => { build() }, [])`,
      errors: [{ messageId: 'returnsNothing', data: { hook: 'useLocalNodes' } }],
    },
  ],
})
