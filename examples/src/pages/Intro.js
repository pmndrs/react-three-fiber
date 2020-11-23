import * as React from 'react'
import styled from 'styled-components'
import { Link, Route, Switch, useRouteMatch, useLocation } from 'react-router-dom'
import * as demos from '../demos'
import { Page as PageImpl } from '../styles'

const defaultComponent = 'Refraction'
const visibleComponents = Object.entries(demos)
  //.filter(([name, item]) => !item.dev)
  .reduce((acc, [name, item]) => ({ ...acc, [name]: item }), {})

export default function Intro() {
  const match = useRouteMatch('/demo/:name')

  const { bright } = visibleComponents[match ? match.params.name : defaultComponent]
  const render = React.useCallback(function callback({ match }) {
    const Component = visibleComponents[match.params.name].Component
    return <Component />
  }, [])

  const style = React.useMemo(() => ({ color: bright ? '#2c2d31' : 'white' }), [bright])

  return (
    <PageImpl>
      <React.Suspense fallback={null}>
        <Switch>
          <Route exact path="/" component={visibleComponents.Refraction.Component} />
          <Route exact path="/demo/:name" render={render} />
        </Switch>
      </React.Suspense>
      <Demos />
      <a href="https://github.com/pmndrs/react-three-fiber" style={style}>
        Github
      </a>
    </PageImpl>
  )
}

function Demos() {
  const location = useLocation()
  const match = useRouteMatch('/demo/:name')
  const dev = React.useMemo(() => new URLSearchParams(location.search).get('dev'), [location.search])
  const { bright } = visibleComponents[match ? match.params.name : defaultComponent]
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
