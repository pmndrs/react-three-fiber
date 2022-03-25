import * as React from 'react'
import styled from 'styled-components'
import { useErrorBoundary } from 'use-error-boundary'
import { Global, Loading, Page, DemoPanel, Dot } from './styles'
import * as demos from './demos'
import { Route, Link, useRoute, Redirect } from 'wouter'

const defaultComponent = 'Reparenting'
const visibleComponents: any = Object.entries(demos).reduce((acc, [name, item]) => ({ ...acc, [name]: item }), {})
const label = {
  position: 'absolute',
  padding: '10px 20px',
  bottom: 'unset',
  right: 'unset',
  top: 60,
  left: 60,
  maxWidth: 380,
}

function ErrorBoundary({ children, fallback, name }: any) {
  const { ErrorBoundary, didCatch, error } = useErrorBoundary()
  return didCatch ? fallback(error) : <ErrorBoundary key={name}>{children}</ErrorBoundary>
}

function Demo() {
  const [match, params] = useRoute('/demo/:name')
  const compName = match ? params.name : defaultComponent
  const Component = visibleComponents[compName].Component

  return (
    <ErrorBoundary
      key={compName}
      fallback={(e: any) => <span style={{ ...label, border: '2px solid #ff5050', color: '#ff5050' }}>{e}</span>}>
      <Component />
    </ErrorBoundary>
  )
}

function Intro() {
  const dev = new URLSearchParams(location.search).get('dev')

  return (
    <Page>
      <React.Suspense fallback={<Loading />}>
        <Route path="/" children={<Redirect to={`/demo/${defaultComponent}`} />} />
        <Route path="/demo/:name">
          <Demo />
        </Route>
      </React.Suspense>

      {dev === null && <Dots />}
    </Page>
  )
}

function Dots() {
  const [match, params] = useRoute('/demo/:name')
  if (!match) return null

  const compName = match ? params.name : defaultComponent

  return (
    <>
      <DemoPanel>
        {Object.entries(visibleComponents).map(function mapper([name, item]) {
          const background = params!.name === name ? 'salmon' : '#fff'
          return <Dot key={name} to={`/demo/${name}`} style={{ background }} />
        })}
      </DemoPanel>
      <span style={{ color: 'white' }}>{compName}</span>
    </>
  )
}

export default function App() {
  return (
    <>
      <Global />
      <Intro />
    </>
  )
}
