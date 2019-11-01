import React, { Suspense } from 'react'
import styled from 'styled-components'
import { Link, Route, Switch, useRouteMatch } from 'react-router-dom'
import Label from './components/Label'
import * as demos from '../demos'
import { Page as PageImpl } from '../styles'

const Page = styled(PageImpl)`
  padding: 25px;
`

const visibleComponents = Object.entries(demos)
  .filter(([name, item]) => !item.dev)
  .reduce((acc, [name, item]) => ({ ...acc, [name]: item }), {})

export default function Intro() {
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
      <R3FBatch>
        <span>React three fiber</span>
        <br /> is a React renderer
        <br /> for Three.js
      </R3FBatch>
      <Bubble children="</>" />
      <Label />
    </Page>
  )
}

function Demos() {
  let match = useRouteMatch('/demo/:name')
  return (
    <DemoPanel>
      {Object.entries(visibleComponents).map(([name, item]) => (
        <Link key={name} to={`/demo/${name}`}>
          <Spot
            style={{
              background: (!match && name === 'Swarm') || (match && match.params.name === name) ? 'salmon' : 'white',
            }}
          />
        </Link>
      ))}
    </DemoPanel>
  )
}

const R3FBatch = styled.div`
  pointer-events: none;
  position: absolute;
  font-weight: 700;
  font-size: 1.5em;
  line-height: 1em;
  text-transform: uppercase;
  color: white;

  bottom: 0%;
  left: 50%;
  transform: translate3d(-50%, 0%, 0);
  max-width: 400px;
  background: #171720;
  padding: 40px;
  box-shadow: #ffffff30 0px 0px 100px 0px;

  & span {
    display: inline-block;
    font-family: 'Josefin Sans', sans-serif;
    font-size: 2.2em;
    line-height: 0.9em;
    margin-bottom: 0.2em;
  }
`

const Bubble = styled.div`
  font-family: 'Josefin Sans', sans-serif;
  position: absolute;
  right: 60px;
  bottom: 60px;
  border-radius: 50%;
  background: #171720;
  color: white;
  font-size: 1.75em;
  padding: 1rem;
  height: 4rem;
  width: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: #ffffff30 0px 0px 15px 0px;
`

const DemoPanel = styled.div`
  position: absolute;
  top: 60px;
  left: 60px;
  max-width: 250px;
`

const Spot = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin: 8px;
  box-shadow: #00000040 0px 0px 15px 0px;
`
