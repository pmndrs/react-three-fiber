import React, { Suspense } from 'react'
import styled from 'styled-components'
import { HashRouter, Link, Route, Routes, useMatch, useLocation, useParams } from 'react-router-dom'
import { useErrorBoundary } from 'use-error-boundary'
import { Global, Page as PageImpl } from './styles'
import * as demos from './demos'

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

function Item() {
  let params = useParams()
  const Component = visibleComponents[params.name].Component
  return (
    <ErrorBoundary
      key={params.name}
      fallback={(e: any) => <span style={{ ...label, border: '2px solid #ff5050', color: '#ff5050' }}>{e}</span>}>
      <Component />
    </ErrorBoundary>
  )
}

function Intro() {
  const Component = visibleComponents[defaultComponent].Component
  return (
    <Page>
      <Suspense fallback={<HtmlLoader />}>
        <Routes>
          <Route path="/" element={<Component />} />
          <Route path="/demo/:name" element={<Item />} />
        </Routes>
      </Suspense>
      <Dots />
    </Page>
  )
}

function Dots() {
  const location = useLocation()
  const match: any = useMatch('/demo/:name')
  const dev = React.useMemo(() => new URLSearchParams(location.search).get('dev'), [location.search])
  const { bright } = visibleComponents[match?.params.name ?? defaultComponent]
  return (
    <>
      <DemoPanel>
        {Object.entries(visibleComponents).map(function mapper([name, item]) {
          const style = {
            // to complex to optimize
            background:
              (!match && name === defaultComponent) || (match && match.params.name === name)
                ? 'salmon'
                : bright
                ? '#2c2d31'
                : 'white',
          }
          return dev ? null : (
            <Link key={name} to={`/demo/${name}`}>
              <Spot style={style} />
            </Link>
          )
        })}
      </DemoPanel>
      <span style={{ color: bright ? '#2c2d31' : 'white' }}>{match?.params.name ?? defaultComponent}</span>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Global />
      <Intro />
    </HashRouter>
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
