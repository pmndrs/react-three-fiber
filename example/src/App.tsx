import * as React from 'react'
import styled from 'styled-components'
import { useErrorBoundary } from 'use-error-boundary'
import { Global, Page as PageImpl } from './styles'
import * as demos from './demos'
import Gestures from './demos/Gestures'
import { Route, Link, useRoute } from 'wouter'

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

function HtmlLoader() {
  return <span style={{ ...label, border: '2px solid #10af90', color: '#10af90' }}>waiting...</span>
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
      <React.Suspense fallback={<HtmlLoader />}>
        <Route exact path="/demo/:name">
          <Demo />
        </Route>
      </React.Suspense>

      {dev === null && <Dots />}
    </Page>
  )
}

function Dots() {
  const [match, params] = useRoute('/demo/:name')
  const compName = match ? params.name : defaultComponent

  const { bright } = visibleComponents[compName]

  return (
    <>
      <DemoPanel>
        {Object.entries(visibleComponents).map(function mapper([name, item]) {
          const background = params!.name === name ? 'salmon' : !bright ? '#fff' : '#2c2d31'
          return (
            <Link key={name} to={`/demo/${name}`}>
              <Spot style={{ background }} />
            </Link>
          )
        })}
      </DemoPanel>
      <span style={{ color: bright ? '#2c2d31' : 'white' }}>{compName}</span>
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

const Page = styled(PageImpl)`
  & > h1 {
    position: absolute;
    top: 70px;
    left: 60px;
  }

  & > span {
    position: absolute;
    bottom: 60px;
    right: 60px;
  }
`

const DemoPanel = styled.div`
  position: absolute;
  bottom: 50px;
  left: 50px;
  max-width: 250px;
`

const Spot = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin: 8px;
`
