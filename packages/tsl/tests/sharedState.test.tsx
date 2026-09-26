/**
 * @fileoverview Shared TSL state across canvases and portals.
 *
 * TSL resources belong to a renderer: every canvas drawing through it -- the primary, its
 * secondaries, and all their portals -- sees the same uniforms, nodes, buffers and GPU storage. They
 * live on the primary canvas's RootState. Portals follow their parent's state; a secondary canvas is
 * given the primary's map objects by the TSL root extension and follows them.
 *
 * So `state.uniforms` reads the same everywhere: in useFrame, useThree, creators and handlers, on any
 * canvas or portal. This file pins that on real roots (see ./roots).
 */
import * as React from 'react'
import { act } from 'react'
import * as THREE from 'three'
import { float, mix } from 'three/tsl'

import { createPortal, extend, getScheduler, useFrame, useStore, useThree } from '@react-three/fiber'
import type { RootStore } from '@react-three/fiber'
import { useUniforms, useUniform, useNodes } from '../src'
import { notifyRootExtensionsHmr } from '../../fiber/src/core/extensions'
import {
  mountIndependent,
  mountPrimary,
  mountSecondary,
  prefix,
  setupRealRoots,
  startSecondary,
  unmount,
} from './roots'

setupRealRoots('shared-state')

/** Renders nothing; hands the store it sees (a portal's own, inside a portal) to the test. */
function Probe({ onRender }: { onRender: (store: RootStore) => void }) {
  onRender(useStore())
  return null
}

function Portaled({ children }: { children: React.ReactNode }) {
  const [target] = React.useState(() => new THREE.Group())
  return createPortal(children, target)
}

const SHARED = ['uniforms', 'nodes', 'buffers', 'gpuStorage'] as const

//* Single canvas ==============================

describe('single canvas', () => {
  it('hooks, state.uniforms and useFrame all read the same uniform', async () => {
    const useAB = () => useUniforms({ uA: 1, uB: 2 })
    let api!: ReturnType<typeof useAB>
    let store!: RootStore
    const frames: unknown[] = []
    const Comp = () => {
      api = useAB()
      useFrame(({ uniforms }) => {
        frames.push(uniforms.uA)
      })
      return null
    }
    ;({ store } = await mountPrimary(<Comp />))

    expect(store.getState().uniforms.uA).toBe(api.uA)

    // Imperative writes need no store write.
    api.uA.value = 10
    expect((store.getState().uniforms.uA as any).value).toBe(10)

    await act(async () => getScheduler().step(1000))
    expect(frames.at(-1)).toBe(api.uA)

    await act(async () => api.removeUniforms('uA'))
    expect(store.getState().uniforms.uA).toBeUndefined()
    expect(store.getState().uniforms.uB).toBeDefined()
  })
})

//* Primary + secondary ==============================

describe('primary + secondary canvas', () => {
  it('the secondary holds the primary map objects, not copies', async () => {
    const OnPrimary = () => {
      useUniforms({ uFromPrimary: 1 })
      useNodes(() => ({ nPrimary: float(1) }))
      return null
    }
    const { store: primary, id } = await mountPrimary(<OnPrimary />)
    const { store: secondary } = await mountSecondary(id, <group />)

    for (const key of SHARED) expect(secondary.getState()[key]).toBe(primary.getState()[key])
    expect(secondary.getState()._hmrVersion).toBe(primary.getState()._hmrVersion)
    expect(secondary.getState().uniforms.uFromPrimary).toBeDefined()
  })

  it('a uniform created on either canvas is visible from both', async () => {
    const OnPrimary = () => {
      useUniforms({ uFromPrimary: 1 })
      return null
    }
    const OnSecondary = () => {
      useUniforms({ uFromSecondary: 2 })
      return null
    }
    const { store: primary, id } = await mountPrimary(<OnPrimary />)
    const { store: secondary } = await mountSecondary(id, <OnSecondary />)

    for (const store of [primary, secondary]) {
      expect(store.getState().uniforms.uFromPrimary).toBeDefined()
      expect(store.getState().uniforms.uFromSecondary).toBeDefined()
    }
  })

  it('useFrame on the secondary reads state.uniforms (regression: it was empty)', async () => {
    let uTime: unknown
    const seen: unknown[] = []
    const OnPrimary = () => {
      uTime = useUniforms({ uTime: 0 }).uTime
      return null
    }
    const Reader = () => {
      useFrame(({ uniforms }) => {
        seen.push(uniforms.uTime)
      })
      return null
    }
    const { id } = await mountPrimary(<OnPrimary />)
    await mountSecondary(id, <Reader />)

    await act(async () => getScheduler().step(1000))
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.at(-1)).toBe(uTime)
  })

  it("the secondary's useThree(s => s.uniforms) re-renders for a new primary uniform, not for unrelated writes", async () => {
    const renders: string[][] = []
    const Reader = () => {
      const uniforms = useThree((s) => s.uniforms)
      renders.push(Object.keys(uniforms))
      return null
    }
    const Late = () => {
      useUniforms({ uLate: 1 })
      return null
    }
    const { root: primaryRoot, store: primary, id } = await mountPrimary(<group />)
    await mountSecondary(id, <Reader />)
    const before = renders.length

    // Unrelated write on the primary: nothing shared changed, so the secondary is not written to.
    await act(async () => primary.getState().setSize(400, 300))
    expect(renders.length).toBe(before)

    await act(async () => primaryRoot.render(<Late />))
    expect(renders.at(-1)).toContain('uLate')
  })

  it('a creator on the secondary sees primary uniforms', async () => {
    const OnPrimary = () => {
      useUniforms({ color1: new THREE.Color('red'), color2: new THREE.Color('blue') })
      return null
    }
    let seen: unknown[] = []
    let result: Record<string, unknown> = {}
    const OnSecondary = () => {
      result = useNodes(({ uniforms }) => {
        seen = [uniforms.color1, uniforms.color2]
        return { myNode: mix(uniforms.color1 as any, uniforms.color2 as any, 0.5) }
      })
      return null
    }
    const { store: primary, id } = await mountPrimary(<OnPrimary />)
    await mountSecondary(id, <OnSecondary />)

    expect(seen[0]).toBe(primary.getState().uniforms.color1)
    expect(seen[1]).toBe(primary.getState().uniforms.color2)
    expect(result.myNode).toBeDefined()
    expect(primary.getState().nodes.myNode).toBe(result.myNode)
  })

  it("useUniforms('scope') on the secondary returns the shared nodes to write to", async () => {
    let primaryHit: any
    const OnPrimary = () => {
      primaryHit = useUniforms({ uHit: 0 }, 'fx').uHit
      return null
    }
    let fx: any
    const OnSecondary = () => {
      fx = useUniforms('fx')
      return null
    }
    const { store: primary, id } = await mountPrimary(<OnPrimary />)
    await mountSecondary(id, <OnSecondary />)

    fx.uHit.value = 1
    expect(fx.uHit).toBe(primaryHit)
    expect((primary.getState().uniforms as any).fx.uHit.value).toBe(1)
  })

  it('useUniform on the secondary registers where useUniforms looks (regression)', async () => {
    let single: unknown
    const OnSecondary = () => {
      single = useUniform('uSingle', 3)
      return null
    }
    const { store: primary, id } = await mountPrimary(<group />)
    const { store: secondary } = await mountSecondary(id, <OnSecondary />)

    expect(primary.getState().uniforms.uSingle).toBe(single)
    expect(secondary.getState().uniforms.uSingle).toBe(single)
  })

  it('two independent canvases share nothing', async () => {
    const A = () => {
      useUniforms({ uOnlyA: 1 })
      return null
    }
    const { store: a } = await mountIndependent(<A />)
    const { store: b } = await mountIndependent(<group />)

    expect(a.getState().uniforms).not.toBe(b.getState().uniforms)
    expect(a.getState().uniforms.uOnlyA).toBeDefined()
    expect(b.getState().uniforms.uOnlyA).toBeUndefined()
  })
})

//* Portals ==============================

describe('portals', () => {
  it('portals and nested portals on the primary and a secondary all read the same maps', async () => {
    const stores = new Map<string, RootStore>()
    const at = (key: string) => (s: RootStore) => stores.set(key, s)
    let hit: any
    const CreatesInNestedPortal = () => {
      useUniforms({ uDeep: 1 })
      return null
    }
    const WritesFromPortal = () => {
      const fx = useUniforms('fx')
      hit = fx
      return null
    }
    const Scoped = () => {
      useUniforms({ uHit: 0 }, 'fx')
      return null
    }
    const { store: primary, id } = await mountPrimary(
      <>
        <Scoped />
        <Portaled>
          <Probe onRender={at('p1')} />
          <Portaled>
            <CreatesInNestedPortal />
            <Probe onRender={at('p2')} />
          </Portaled>
        </Portaled>
      </>,
    )
    await mountSecondary(
      id,
      <Portaled>
        <Probe onRender={at('s1')} />
        <Portaled>
          <WritesFromPortal />
          <Probe onRender={at('s2')} />
        </Portaled>
      </Portaled>,
    )

    const uniforms = primary.getState().uniforms
    expect(uniforms.uDeep).toBeDefined()
    for (const key of ['p1', 'p2', 's1', 's2'])
      expect([key, stores.get(key)!.getState().uniforms]).toEqual([key, uniforms])

    hit.uHit.value = 1
    expect((uniforms as any).fx.uHit.value).toBe(1)
  })
})

//* Mount and unmount order ==============================

describe('mount and unmount order', () => {
  it('a secondary that starts before its primary exists still shares its maps', async () => {
    const OnSecondary = () => {
      useUniforms({ uEarly: 1 })
      return null
    }
    const id = `${prefix()}-late-primary`
    const secondary = startSecondary(id, <OnSecondary />)
    const { store: primary } = await mountPrimary(<group />, id)
    let secondaryStore!: RootStore
    await act(async () => {
      secondaryStore = await secondary.ready
    })

    expect(primary.getState().uniforms.uEarly).toBeDefined()
    expect(secondaryStore.getState().uniforms).toBe(primary.getState().uniforms)
  })

  it('unmounting a secondary first leaves the primary intact and stops following', async () => {
    const OnPrimary = () => {
      useUniforms({ uKeep: 1 })
      return null
    }
    const Late = () => {
      useUniforms({ uAfter: 1 })
      return null
    }
    const { root: primaryRoot, store: primary, id } = await mountPrimary(<OnPrimary />)
    const secondary = await mountSecondary(id, <group />)
    const frozen = secondary.store.getState().uniforms

    await unmount(secondary.root)
    expect(primary.getState().uniforms.uKeep).toBeDefined()

    await act(async () => primaryRoot.render(<Late />))
    expect(primary.getState().uniforms.uAfter).toBeDefined()
    expect(secondary.store.getState().uniforms).toBe(frozen)
  })

  it('unmounting the primary first leaves the secondary with its last maps and no throw', async () => {
    const OnPrimary = () => {
      useUniforms({ uGone: 1 })
      return null
    }
    const Reader = () => {
      useFrame(({ uniforms }) => {
        void uniforms.uGone
      })
      return null
    }
    const { root: primaryRoot, id } = await mountPrimary(<OnPrimary />)
    const secondary = await mountSecondary(id, <Reader />)

    await unmount(primaryRoot)
    expect(secondary.store.getState().uniforms.uGone).toBeDefined()
    // Frames that still run on the secondary read the last maps rather than throwing.
    await expect(act(async () => getScheduler().step(1000))).resolves.not.toThrow()
  })

  it('a primary that remounts starts from fresh maps', async () => {
    const OnPrimary = () => {
      useUniforms({ uOld: 1 })
      return null
    }
    const { root, store: first } = await mountPrimary(<OnPrimary />)
    const old = first.getState().uniforms
    await unmount(root)

    const { store: second } = await mountPrimary(<group />)
    expect(second.getState().uniforms).not.toBe(old)
    expect(second.getState().uniforms.uOld).toBeUndefined()
  })
})

//* StrictMode ==============================

describe('StrictMode', () => {
  it('double rendering creates one uniform, shared with the secondary', async () => {
    const seen: unknown[] = []
    const Comp = () => {
      const { uStrict } = useUniforms({ uStrict: 1 })
      seen.push(uStrict)
      return null
    }
    const { store: primary, id } = await mountPrimary(
      <React.StrictMode>
        <Comp />
      </React.StrictMode>,
    )
    const { store: secondary } = await mountSecondary(
      id,
      <React.StrictMode>
        <Comp />
      </React.StrictMode>,
    )

    expect(new Set(seen).size).toBe(1)
    expect(Object.keys(primary.getState().uniforms)).toEqual(['uStrict'])
    expect(secondary.getState().uniforms).toBe(primary.getState().uniforms)
  })
})

//* HMR ==============================

describe('hot reload', () => {
  it('one hot update reaches every canvas on the renderer', async () => {
    const creatorRuns = { primary: 0, secondary: 0 }
    const OnPrimary = () => {
      useNodes(() => {
        creatorRuns.primary++
        return { nPrimary: float(1) }
      })
      return null
    }
    const OnSecondary = () => {
      useNodes(() => {
        creatorRuns.secondary++
        return { nSecondary: float(2) }
      })
      return null
    }
    const { store: primary, id } = await mountPrimary(<OnPrimary />)
    const secondary = await mountSecondary(id, <OnSecondary />)
    const before = { ...creatorRuns }
    const versionBefore = primary.getState()._hmrVersion

    // The Canvas that noticed the update notifies its own root; the refresh is renderer-wide.
    await act(async () => notifyRootExtensionsHmr(secondary.store))

    expect(primary.getState()._hmrVersion).toBe(versionBefore + 1)
    expect(secondary.store.getState()._hmrVersion).toBe(versionBefore + 1)
    expect(creatorRuns.primary).toBeGreaterThan(before.primary)
    expect(creatorRuns.secondary).toBeGreaterThan(before.secondary)
    expect(secondary.store.getState().nodes).toBe(primary.getState().nodes)
    expect(primary.getState().nodes.nPrimary).toBeDefined()
    expect(primary.getState().nodes.nSecondary).toBeDefined()
  })
})
