import * as React from 'react'
import { useErrorBoundary } from 'use-error-boundary'
import { Redirect, Route, useLocation, useRoute } from 'wouter'

import { DemoPanel, Dot, Error, Loading, Page } from './components'
import './styles.css'

import { demoGroups } from './demos'

const DEFAULT_COMPONENT_NAME = 'ClickAndHover'

//* Component Categories ==============================
// `demoGroups` (demos/index.tsx) is the one table of contents: every demo, in its group.
const visibleComponents = Object.assign({}, ...demoGroups.map((group) => group.demos)) as Record<
  string,
  (typeof demoGroups)[number]['demos'][string]
>
const exampleType = new Map(
  demoGroups.flatMap((group) => Object.keys(group.demos).map((name) => [name, group.name] as const)),
)
const groupOrder = demoGroups.map((group) => group.name)
const visibleComponentEntries = Object.entries(visibleComponents).sort(([a], [b]) => {
  const typeDifference = groupOrder.indexOf(exampleType.get(a)!) - groupOrder.indexOf(exampleType.get(b)!)
  return typeDifference || a.localeCompare(b)
})

function shuffleExamples(entries: typeof visibleComponentEntries) {
  const shuffled = [...entries]

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const entry = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = entry
  }

  return shuffled
}

function ErrorBoundary({ children, fallback, name }: any) {
  const { ErrorBoundary, didCatch, error } = useErrorBoundary()
  return didCatch ? fallback(error) : <ErrorBoundary key={name}>{children}</ErrorBoundary>
}

function Demo() {
  const [match, params] = useRoute('/demo/:name')
  const compName = match ? params.name : DEFAULT_COMPONENT_NAME
  const { Component } = visibleComponents[compName]

  return (
    <ErrorBoundary key={compName} fallback={(e: any) => <Error>{e.message}</Error>}>
      <Component />
    </ErrorBoundary>
  )
}

function Dots({ entries, hidden = false }: { entries: typeof visibleComponentEntries; hidden?: boolean }) {
  const [match, params] = useRoute('/demo/:name')
  const [, navigate] = useLocation()

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isEditing =
        target instanceof HTMLElement &&
        (target.isContentEditable || target.matches('input, textarea, select, [role="textbox"]'))

      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isEditing) {
        return
      }

      const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
      if (direction === 0) return

      const currentIndex = entries.findIndex(([name]) => name === params?.name)
      if (currentIndex === -1) return

      event.preventDefault()
      const nextIndex = (currentIndex + direction + entries.length) % entries.length
      navigate(`/demo/${entries[nextIndex][0]}${location.search}`)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [entries, navigate, params?.name])

  if (!match) return null

  const getBackground = (name: string) => {
    if (params.name === name) return 'salmon'
    if (exampleType.get(name) === 'legacy') return '#ffcc00' // Yellow for legacy
    if (exampleType.get(name) === 'webgpu') return '#00ccff' // Cyan for WebGPU
    return '#fff' // White for default
  }

  return (
    <>
      {!hidden && (
        <DemoPanel>
          {entries.map(function mapper([name]) {
            const background = getBackground(name)
            return <Dot key={name} to={`/demo/${name}${location.search}`} style={{ background }} />
          })}
        </DemoPanel>
      )}
      <span style={{ color: 'white' }}>{params.name}</span>
    </>
  )
}

export default function App() {
  const searchParams = new URLSearchParams(location.search)
  const dev = searchParams.get('dev')
  const quiet = searchParams.has('quiet')
  const random = searchParams.has('random')
  const exampleEntries = React.useMemo(
    () => (random ? shuffleExamples(visibleComponentEntries) : visibleComponentEntries),
    [random],
  )

  return (
    <Page>
      <React.Suspense fallback={<Loading />}>
        <Route path="/" children={<Redirect to={`/demo/${DEFAULT_COMPONENT_NAME}${location.search}`} />} />
        <Route path="/demo/:name">
          <Demo />
        </Route>
      </React.Suspense>
      {dev === null && <Dots entries={exampleEntries} hidden={quiet} />}
    </Page>
  )
}
