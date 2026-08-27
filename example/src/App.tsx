import * as React from 'react'
import { useErrorBoundary } from 'use-error-boundary'
import { Redirect, Route, useRoute } from 'wouter'

import { DemoPanel, Dot, Error, Loading, Page } from './components'
import './styles.css'

import * as demos from './demos'

const DEFAULT_COMPONENT_NAME = 'ClickAndHover'

//* Component Categories ==============================
const defaultExamples = [
  'Activity',
  'AutoDispose',
  'ChangeTexture',
  'ClickAndHover',
  'ContextMenuOverride',
  'FileDragDrop',
  'FlushSync',
  'Gestures',
  'Gltf',
  'HtmlBetweenCanvases',
  'Inject',
  'Layers',
  'MultiMaterial',
  'MultiRender',
  'NestedCamera',
  'PortalTest',
  'ResetProps',
  'Selection',
  'StopPropagation',
  'SuspenseAndErrors',
  'SuspenseMaterial',
  'Viewcube',
  'ViewTracking',
]

const legacyExamples = ['EventPriority', 'Lines', 'MultiView', 'Pointcloud', 'Portals', 'Reparenting', 'SVGRenderer']

const webgpuExamples = [
  'UseFrameNextControls',
  'UseFrameNextFPS',
  'UseFrameNextPhases',
  'VerekiaFpsDrop',
  'VisibilityEvents',
  'WebGPU',
  'WebGPUIndirect',
  'WebGPUMotionBlur',
  'WebGPUMultiCanvas',
  'WebGPURagingSea',
  'WebGPUSharedUniforms',
]

const visibleComponents: any = Object.entries(demos).reduce((acc, [name, item]) => ({ ...acc, [name]: item }), {})
const exampleGroups = [defaultExamples, legacyExamples, webgpuExamples]
const exampleType = new Map(exampleGroups.flatMap((examples, type) => examples.map((name) => [name, type] as const)))
const visibleComponentEntries = Object.entries(visibleComponents).sort(([a], [b]) => {
  const typeDifference = (exampleType.get(a) ?? 0) - (exampleType.get(b) ?? 0)
  return typeDifference || a.localeCompare(b)
})

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

function Dots() {
  const [match, params] = useRoute('/demo/:name')
  if (!match) return null

  const getBackground = (name: string) => {
    if (params.name === name) return 'salmon'
    if (exampleType.get(name) === 1) return '#ffcc00' // Yellow for legacy
    if (exampleType.get(name) === 2) return '#00ccff' // Cyan for WebGPU
    return '#fff' // White for default
  }

  return (
    <>
      <DemoPanel>
        {visibleComponentEntries.map(function mapper([name]) {
          const background = getBackground(name)
          return <Dot key={name} to={`/demo/${name}`} style={{ background }} />
        })}
      </DemoPanel>
      <span style={{ color: 'white' }}>{params.name}</span>
    </>
  )
}

export default function App() {
  const dev = new URLSearchParams(location.search).get('dev')

  return (
    <Page>
      <React.Suspense fallback={<Loading />}>
        <Route path="/" children={<Redirect to={`/demo/${DEFAULT_COMPONENT_NAME}`} />} />
        <Route path="/demo/:name">
          <Demo />
        </Route>
      </React.Suspense>
      {dev === null && <Dots />}
    </Page>
  )
}
