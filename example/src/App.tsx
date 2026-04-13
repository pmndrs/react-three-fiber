import * as React from 'react'
import { useErrorBoundary } from 'use-error-boundary'
import { Redirect, Route, useRoute } from 'wouter'

import { DemoPanel, Dot, Error, Loading, Page } from './components'
import './styles.css'

import * as demos from './demos'

const DEFAULT_COMPONENT_NAME = 'Portals'
const visibleComponents: any = Object.entries(demos).reduce((acc, [name, item]) => ({ ...acc, [name]: item }), {})

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

  return (
    <>
      <DemoPanel>
        {Object.entries(visibleComponents).map(function mapper([name, item]) {
          const background = params.name === name ? 'salmon' : '#fff'
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
