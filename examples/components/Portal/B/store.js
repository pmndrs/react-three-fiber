import guid from 'uuid'
import create from 'zustand'
import produce from 'immer'
import React, { useEffect } from 'react'

const store = (set, get) => ({
  plugins: {},
  views: {},
  actions: {
    connectView: root => {
      const id = guid()
      set(draft => void (draft.views[id] = { id, root }))
      return () => set(draft => void delete draft.views[id])
    },
    connectPlugin(name, root) {
      const id = guid()
      set(state => {
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
      return () => set(draft => void delete draft.plugins[id])
    },
  },
})

const immer = config => (set, get, api) => config(fn => set(produce(fn)), get, api)
const [useStore] = create(immer(store))

function useView(root, dependencies = []) {
  const connectView = useStore(state => state.actions.connectView)
  useEffect(() => connectView(root), dependencies)
}

export { useStore, useView }
