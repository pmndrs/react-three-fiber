import guid from 'uuid'
import create from 'zustand'
import produce from 'immer'

const store = set => ({
  plugins: {},
  createPlugin(name, uiRoot, threeRoot = () => null) {
    set(state => {
      const id = guid()
      state.plugins[id] = {
        id,
        name,
        uiRoot,
        threeRoot,
        visible: true,
        open: true,
        state: {},
        set: fn => set(draft => fn(draft.plugins[id].state)),
      }
    })
  },
})

const immer = config => (set, get) => config(fn => set(produce(fn)), get)
const [useStore] = create(immer(store))

export { useStore }
