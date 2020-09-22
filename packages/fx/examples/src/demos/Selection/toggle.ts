import produce from 'immer'

export default function toggle(state, item) {
  return produce(state, (draft) => {
    const i = draft.findIndex((obj) => obj.current.uuid === item.current.uuid)

    if (i > -1) {
      draft.splice(i, 1)
    } else {
      draft.push(item)
    }
  })
}
