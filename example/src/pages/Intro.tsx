import React, { Suspense } from 'react'
import styled from 'styled-components'
import { Link, Route, Switch, useRouteMatch, useLocation } from 'react-router-dom'
import * as demos from '../demos'
import { Page as PageImpl } from '../styles'

const defaultComponent = 'Reparenting'
const visibleComponents: any = Object.entries(demos)
  //.filter(([name, item]) => !item.dev)
  .reduce((acc, [name, item]) => ({ ...acc, [name]: item }), {})

export default function Intro() {
  let match: any = useRouteMatch('/demo/:name')
  let { bright } = visibleComponents[match?.params.name ?? defaultComponent]
  return (
    <Page>
      <Suspense fallback={null}>
        <Switch>
          <Route exact path="/" component={visibleComponents[defaultComponent].Component} />
          <Route
            exact
            path="/demo/:name"
            render={({ match }) => {
              const Component = visibleComponents[match.params.name].Component
              return <Component />
            }}
          />
        </Switch>
      </Suspense>
      <Demos />
      <a href="https://github.com/pmndrs/react-three-fiber" style={{ color: bright ? '#2c2d31' : 'white' }}>
        Github
      </a>
    </Page>
  )
}

function Demos() {
  const location = useLocation()
  const match: any = useRouteMatch('/demo/:name')
  const dev = React.useMemo(() => new URLSearchParams(location.search).get('dev'), [location.search])
  const { bright } = visibleComponents[match?.params.name ?? defaultComponent]
  console.log(visibleComponents)
  return (
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
  )
}

const Page = styled(PageImpl)`
  padding: 20px;

  & > h1 {
    position: absolute;
    top: 70px;
    left: 60px;
  }

  & > a {
    position: absolute;
    bottom: 60px;
    right: 60px;
    font-size: 1.2em;
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
