import React, { Suspense } from 'react'
import styled from 'styled-components'
import { Link, Route, Switch, useRouteMatch } from 'react-router-dom'
import Label from './components/Label'
import * as demos from '../demos'
import { Page as PageImpl } from '../styles'

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

const defaultComponent = 'Refraction'
const visibleComponents = Object.entries(demos)
  //.filter(([name, item]) => !item.dev)
  .reduce((acc, [name, item]) => ({ ...acc, [name]: item }), {})

export default function Intro() {
  let match = useRouteMatch('/demo/:name')
  let { bright } = visibleComponents[match ? match.params.name : defaultComponent]
  return (
    <Page>
      <Suspense fallback={null}>
        <Switch>
          <Route exact path="/" component={visibleComponents.Refraction.Component} />
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
      {/*<h1 style={{ color: bright ? '#2c2d31' : 'white' }}>
        three
        <br />
        zero
        <br />
        seven.
      </h1>*/}
      <a href="https://github.com/drcmda/react-three-fiber" style={{ color: bright ? '#2c2d31' : 'white' }}>
        Github
      </a>
    </Page>
  )
}

function Demos() {
  let match = useRouteMatch('/demo/:name')
  let { bright } = visibleComponents[match ? match.params.name : defaultComponent]
  return (
    <DemoPanel>
      {Object.entries(visibleComponents).map(([name, item]) => (
        <Link key={name} to={`/demo/${name}`}>
          <Spot
            style={{
              background:
                (!match && name === defaultComponent) || (match && match.params.name === name)
                  ? 'salmon'
                  : bright
                  ? '#2c2d31'
                  : 'white',
            }}
          />
        </Link>
      ))}
    </DemoPanel>
  )
}

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
