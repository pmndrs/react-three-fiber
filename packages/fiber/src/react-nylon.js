import * as ye from 'react'
const { ReactCurrentDispatcher: G } = ye.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
  f = { current: null },
  C = { current: null },
  he = 0,
  w = 1,
  g = 2,
  J = 3,
  M = 4,
  N = 0,
  K = 1,
  h = 2,
  $ = 0,
  v = 1,
  I = 2,
  z = 3
function m(e, t, n) {
  const r = e.effect
  if (r) {
    for (const l of r)
      if (l.tag === t) {
        if ((n === h || !l.deps?.length) && (l.destroy?.(), (l.destroy = void 0), n === h)) {
          l.tag = $
          continue
        }
        ;(l.destroy = l.create()), l.deps?.length && (l.tag = $)
      }
  }
}
function j(e) {
  e != null &&
    (j(e.child),
    j(e.sibling),
    e.ref != null && (typeof e.ref == 'function' ? e.ref(null) : (e.ref.current = null), (e.ref = null)))
}
function A(e, t) {
  const n = t?.stateNode,
    r = n && !t?.return
  if (e.stateNode != null && e.tag !== g)
    r ? f.current.removeChildFromContainer(n, e.stateNode) : f.current.removeChild(n, e.stateNode)
  else if (e.child != null) {
    A(e.child, t)
    let l = e.child.sibling
    for (; l != null; ) A(l, t), (l = l.sibling)
  }
  d(() => m(e, v, h)), m(e, z, h), m(e, I, h), j(e)
}
function be(e, t) {
  for (const n of t) _(n)
  d(() => m(e, v)), m(e, z), m(e, I), _(e.child), (t.length = 0)
}
function _(e) {
  if (e == null) return
  let t = e.return
  for (; t?.tag === g; ) t = t?.return
  const n = t?.stateNode,
    r = n && (!t.return || t.tag === w)
  if (e.effectTag === N) {
    if (e.stateNode != null && e.tag !== g) {
      if (e.return?.tag === g && e.return?.siblingNode != null)
        r
          ? f.current.insertInContainerBefore(n, e.stateNode, e.return?.siblingNode)
          : f.current.insertBefore(n, e.stateNode, e.return?.siblingNode)
      else {
        let o = null,
          u = e.sibling
        for (; u != null && o == null; ) {
          if (u.stateNode != null && u.tag !== g && u.effectTag !== N) {
            o = u.stateNode
            break
          }
          u = u.sibling
        }
        o != null
          ? r
            ? f.current.insertInContainerBefore(n, e.stateNode, o)
            : f.current.insertBefore(n, e.stateNode, o)
          : r
          ? f.current.appendChildToContainer(n, e.stateNode)
          : f.current.appendChild(n, e.stateNode)
      }
      f.current.finalizeInitialChildren(e.stateNode, e.type, e.props, C.current.stateNode, null) &&
        f.current.commitMount(e.stateNode, e.type, e.props, e)
    }
  } else if (e.effectTag === h) A(e, t)
  else if (e.effectTag === K) {
    if (e.tag === M)
      e.alternate?.props.text !== e.props.text &&
        f.current.commitTextUpdate(e.stateNode, e.alternate?.props.text, e.props.text)
    else if (e.tag !== g) {
      const o = f.current.prepareUpdate(e.stateNode, e.type, e.alternate?.props, e.props, C.current.stateNode, null)
      o !== null && f.current.commitUpdate(e.stateNode, o, e.type, e.alternate?.props, e.props, e)
    }
  }
  const l = e.effectTag
  if (((e.effectTag = null), _(e.child), _(e.sibling), e.ref != null)) {
    const o = e.stateNode == null ? null : f.current.getPublicInstance(e.stateNode)
    typeof e.ref == 'function' ? e.ref(o) : (e.ref.current = o)
  }
  d(() => m(e, v, l)), m(e, z, l), m(e, I, l)
}
let R = !1,
  c = null,
  S = null,
  b = null,
  B = 0
function Z(e, t) {
  return e == null || t == null ? !0 : e.length !== t.length || t.some((n, r) => !Object.is(n, e[r]))
}
function ee() {
  const e = { memoizedState: null, queue: null, next: null }
  return (
    R && ((b = b?.next ?? b ?? c.alternate.hook), (e.memoizedState = b.memoizedState), (e.queue = b.queue)),
    S === null ? (c.hook = S = e) : (S = S.next = e),
    S
  )
}
function L(e, t, n = null) {
  if (R) {
    const r = c.effect[B++]
    ;(r.tag = Z(n, r.deps) ? e : $), (r.create = t), (r.deps = n)
  } else {
    const r = { tag: e, create: t, deps: n }
    c.effect ?? (c.effect = []), (c.effect[B++] = r)
  }
}
function te(e) {
  let t = c.return
  for (; t && t.type !== Symbol.for('react.provider'); ) t = t.return
  return t ? t.props.value : e._defaultValue
}
function Ne(e) {
  return te(e)
}
function Se(e, t, n) {
  const r = { action: n, next: null },
    l = t.pending
  l === null ? (r.next = r) : ((r.next = l.next), (l.next = r)), (t.pending = r)
  const o = t.lastRenderedReducer,
    u = t.lastRenderedState,
    s = o(u, n)
  ;(r.eagerReducer = o), (r.eagerState = s), !Object.is(s, u) && X(e)
}
function ne(e, t, n) {
  const r = ee()
  let l = r.queue
  const o = b,
    u = l?.pending
  if (!R)
    (r.memoizedState = typeof n == 'function' ? n(t) : t),
      (l = r.queue = { pending: null, lastRenderedReducer: e, lastRenderedState: r.memoizedState })
  else if (u != null) {
    const p = u.next
    let a = o.memoizedState,
      i = p
    do {
      const y = i?.action
      ;(a = e(a, y)), (i = i?.next)
    } while (i !== null && i !== p)
    l != null && (l.pending = null), (r.memoizedState = a), l != null && (l.lastRenderedState = a)
  }
  const s = Se.bind(null, c, l)
  return [l?.lastRenderedState, s]
}
const xe = (e, t) => (typeof t == 'function' ? t(e) : t)
function E(e) {
  return ne(xe, e, (t) => (typeof t == 'function' ? t() : t))
}
function q(e, t) {
  const n = ee()
  if (!R) n.memoizedState = { res: e(), deps: t }
  else if (Z(n.memoizedState.deps, t))
    return (n.memoizedState.res = e()), (n.memoizedState.deps = t), n.memoizedState.res
  return n.memoizedState.res
}
function V(e, t) {
  return q(() => e, t)
}
function Te(e) {
  return q(() => ({ current: e }), [])
}
function P(e, t) {
  return L(v, e, t)
}
function F(e, t) {
  return L(I, e, t)
}
function Ce(e, t) {
  return L(z, e, t)
}
function Re(e, t, n) {
  return F(() => {
    if (typeof e == 'function') return e(t()), () => e(null)
    if (e) {
      const r = e
      return (r.current = t()), () => (r.current = null)
    }
  }, n)
}
function ke(e, t) {}
function ve(e) {
  const [t, n] = E(e)
  return P(() => d(() => n(e)), [e]), t
}
let Ie = 0
function ze() {
  return q(() => '' + Ie++, [])
}
function _e(e, t, n) {
  const r = t(),
    [l, o] = E(() => ({ value: r, getSnapshot: t })),
    u = V(() => {
      Object.is(l.value, l.getSnapshot()) || o(l)
    }, [])
  return (
    F(() => {
      ;(l.value = r), (l.getSnapshot = t), u()
    }, [e, r, t]),
    P(() => (u(), e(u)), [e]),
    r
  )
}
function Ee() {
  const [e, t] = E(!1),
    n = V((r) => {
      t(!0),
        d(() => {
          r(), t(!1)
        })
    }, [])
  return [e, n]
}
const qe = {
    readContext: te,
    useCallback: V,
    useContext: Ne,
    useDebugValue: ke,
    useDeferredValue: ve,
    useEffect: P,
    useId: ze,
    useImperativeHandle: Re,
    useInsertionEffect: Ce,
    useLayoutEffect: F,
    useMemo: q,
    useReducer: ne,
    useRef: Te,
    useState: E,
    useSyncExternalStore: _e,
    useTransition: Ee,
  },
  re = (e) => e?.prototype?.isReactComponent,
  Oe = (e) => typeof e?.then == 'function'
function De(e, t, n) {
  ;(c = t), (G.current = qe), (R = e != null)
  let r = c.props.children
  try {
    if (typeof n == 'function')
      if (re(n)) {
        const l = new n(c.props)
        l.props ?? (l.props = c.props), l.state ?? (l.state = {})
        const o = c
        ;(l.forceUpdate = function (u) {
          X(o), u && d(u)
        }),
          (l.setState = function (u, s) {
            const p = typeof u == 'function' ? u(l.state, l.props) : u
            p && (Object.assign(l.state, p), l.forceUpdate(s))
          }),
          c.stateNode ?? (c.stateNode = l),
          (r = l.render())
      } else r = n(c.props, c.ref)
  } catch (l) {
    if (Oe(l)) {
      let o = c
      for (; o.return && o.type !== Symbol.for('react.suspense'); ) o = o.return
      ;(r = o.props.fallback),
        O.push(l),
        l.then((u) => {
          l.value = u
          const s = O.indexOf(l)
          s !== -1 && O.splice(s, 1), X(o)
        })
    } else {
      let o = c
      for (; o.return && !re(o.type); ) o = o.return
      const u = o.stateNode,
        s = o.type.getDerivedStateFromError
      s && u.setState(s(l))
      const p = u?.componentDidCatch?.bind(u)
      if (p) p?.(l, {})
      else throw l
    }
  }
  return (c = null), (G.current = null), (S = null), (b = null), (B = 0), r
}
function Ue(e) {
  typeof e.then == 'function' && (e = e.value)
  let { type: t, props: n = {}, ref: r, key: l } = e,
    o
  return (
    e.$$typeof === Symbol.for('react.portal')
      ? ((o = w), (n = e))
      : typeof e == 'string' || typeof e == 'number'
      ? ((t = ''), (o = M), (n = { text: e }))
      : typeof t == 'string'
      ? (o = J)
      : ((o = g), typeof t != 'function' && (t = t?.render ?? t?.type ?? t?.$$typeof ?? t)),
    { type: t, tag: o, props: n, ref: r, key: l }
  )
}
let H = !1
function Q(e, t) {
  if (!H) return
  ;(t.effectTag = h), ae.push(t)
  let n = e,
    r = e
  for (; r != null && n != null; ) r.effectTag === h && (n.sibling = r.sibling), (n = r), (r = r.sibling)
}
function le(e, t) {
  const n = Ue(t)
  return (n.return = e), n
}
function oe(e, t, n) {
  if (t != null && t.type === n.type) return { ...t, props: n.props, key: n.key, return: e, effectTag: K, alternate: t }
  const r = le(e, n)
  return (r.effectTag = N), r
}
function ue(e, t, n) {
  e.index = n
  const r = e.alternate
  if (r != null) {
    const l = r.index
    return l != null && l < t ? ((e.effectTag = N), t) : l
  } else return (e.effectTag = N), t
}
function we(e) {
  let t = e
  for (; t != null; ) {
    if (t.tag === g) {
      let n = null,
        r = t.sibling
      for (; n === null && r != null; ) r.tag !== g && r.effectTag !== N && (n = r.stateNode), (r = r.sibling)
      t.siblingNode = n
    }
    t = t.sibling
  }
}
function se(e, t, n) {
  let r = null,
    l = null,
    o = e?.child,
    u = null,
    s = 0,
    p = 0
  for (; o != null && s < n.length; s++) {
    u = o.sibling
    const a = n[s]
    if (a.key !== o.key) break
    const i = oe(t, o, a)
    i.alternate == null && Q(t.child, o), (p = ue(i, p, s)), l == null ? (r = i) : (l.sibling = i), (l = i), (o = u)
  }
  if (s === n.length) {
    let a = o
    for (; a != null; ) Q(t.child, a), (a = a.sibling)
  } else {
    const a = new Map()
    for (; s < n.length; s++) {
      let i
      if (o == null) i = le(t, n[s])
      else {
        let y = o
        for (; y != null; ) {
          const me = y.key ?? y.index
          a.set(me, y), (y = y.sibling)
        }
        const Y = n[s],
          ge = a.get(Y.key ?? s)
        ;(i = oe(t, ge, Y)), i.alternate != null && a.delete(i.key ?? s)
      }
      ;(p = ue(i, p, s)), l == null ? (r = i) : (l.sibling = i), (l = i)
    }
    for (const [, i] of a) Q(r, i)
  }
  return we(r), (t.child = r), r
}
const ie = (e) => (Array.isArray(e) ? e : [e]).filter((t) => t != null && typeof t != 'boolean')
function Me(e, t, n) {
  ;(H = !0), se(e, t, ie(n))
}
function $e(e, t, n) {
  ;(H = !1), se(e, t, ie(n))
}
const O = [],
  x = { current: null }
async function je(e) {
  let t
  ;(x.current = new Promise((r) => (t = r))), (x.current.resolve = t)
  const n = await e()
  return await x.current, n
}
const D = []
let W = !1
globalThis.requestIdleCallback ??
  (globalThis.requestIdleCallback = (e) => e({ didTimeout: !1, timeRemaining: () => Number.MAX_VALUE }))
function ce(e) {
  for (W = !0; e.timeRemaining() > 0 && D.length > 0; ) D.shift()?.(e)
  D.length > 0
    ? requestIdleCallback(ce)
    : ((W = !1), O.length === 0 && x.current?.resolve && (x.current.resolve(), (x.current.resolve = void 0)))
}
function d(e) {
  D.push(e), W || requestIdleCallback(ce)
}
const ae = []
let k = null,
  T = null
function X(e) {
  d((t) => {
    const n = { ...e, alternate: e }
    ;(T = n), (k = n), U(t)
  })
}
function Ae(e, t) {
  if (t.tag === J)
    t.stateNode ?? (t.stateNode = f.current.createInstance(t.type, t.props, C.current.stateNode, null, t))
  else if (t.tag === M)
    t.stateNode ?? (t.stateNode = f.current.createTextInstance(t.props.text, C.current.stateNode, null, t))
  else if (t.tag === w) {
    const r = t.stateNode ?? (t.stateNode = t.props.containerInfo)
    e == null && f.current.preparePortalMount(r)
  }
  const n = t.tag === g ? De(e, t, t.type) : t.props.children
  e == null ? $e(e, t, n) : Me(e, t, n)
}
function Be(e) {
  if ((Ae(e.alternate, e), e.child != null)) return e.child
  for (; e != null; ) {
    if (e.sibling != null) return e.sibling
    e = e.return
  }
  return null
}
const fe = [],
  pe = new Map()
function U(e) {
  for (; T != null && e.timeRemaining() > 0; ) T = Be(T)
  if (T != null) return d(U)
  if (k != null) be(k, ae), (k = null)
  else {
    const t = fe.shift()
    return (C.current = t), t == null ? void 0 : ((f.current = pe.get(t.stateNode)), (T = t), (k = t), d(U))
  }
}
function de(e) {
  let t = null
  return {
    createContainer(n, r, l, o, u, s, p, a) {
      return (t = null), n
    },
    updateContainer(n, r, l, o) {
      pe.set(r, e)
      const u = { tag: he, stateNode: r, props: { children: [n] } }
      if (t?.alternate != null) {
        const s = t.alternate
        ;(s.alternate = t), (s.props = u.props), (t = s)
      } else t != null && (u.alternate = t), (t = u)
      fe.push(t), d(U), o && d(o)
    },
    createPortal(n, r, l, o) {
      return {
        $$typeof: Symbol.for('react.portal'),
        key: o == null ? null : '' + o,
        children: n,
        containerInfo: r,
        implementation: l,
      }
    },
    injectIntoDevTools(n) {
      return !1
    },
  }
}
export { de as Reconciler, je as act, de as default, d as startTransition }
//# sourceMappingURL=index.mjs.map
