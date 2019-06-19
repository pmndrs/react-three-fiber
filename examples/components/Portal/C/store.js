import guid from 'uuid'
import create from 'zustand'
import produce from 'immer'
import React, { useEffect, useRef } from 'react'

const store = (set, get) => ({
  plugin_ids: [],
  view_ids: [],
  plugins: {},
  views: {},
  actions: {
    connectView: (id, ref) => {
      set(draft => {
        draft.view_ids.push(id)
        draft.views[id] = { ref, count: 0 }
      })
      return () =>
        set(draft => {
          delete draft.views[id]
          draft.view_ids = draft.view_ids.filter(pid => pid !== id)
        })
    },
    updateView: id => set(draft => void draft.views[id].count++),
    connectPlugin(name, root) {
      const id = guid()
      set(state => {
        state.plugin_ids.push(id)
        state.plugins[id] = {
          id,
          name,
          root,
          visible: true,
          open: true,
          state: {},
          set: fn => set(draft => void fn(draft.plugins[id].state)),
        }
      })
      return () =>
        set(draft => {
          delete draft.plugins[id]
          draft.plugin_ids = draft.plugin_ids.filter(pid => pid !== id)
        })
    },
  },
})

const immer = config => (set, get, api) => config(fn => set(produce(fn)), get, api)
const [useStore, api] = create(immer(store))

function useView(id, root) {
  const actions = useStore(state => state.actions)
  const ref = useRef(root)
  useEffect(() => actions.connectView(id, ref), [])
  useEffect(() => {
    ref.current = root
    actions.updateView(id)
  })
}

export { useStore, useView, api }
