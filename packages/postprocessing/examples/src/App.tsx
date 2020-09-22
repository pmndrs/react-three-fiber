import React from 'react'
import cx from 'classnames'
import { HashRouter as Router, Switch, Route, Redirect } from 'react-router-dom'
import demos from './demos'
import { DemoWrapper, DemoPanel, Spot } from './styles'

const demosEntries = Object.entries(demos)
const [defaultDemoName] = demosEntries[0]
export default function App() {
  return (
    <Router>
      <Switch>
        <Route
          path={`/demo/:name`}
          exact
          render={({ match }) => {
            const ActiveDemo = demos[match.params.name]
            return (
              <DemoWrapper className={cx({ bright: ActiveDemo?.bright })}>
                {!!ActiveDemo ? (
                  <React.Suspense fallback={null}>
                    <ActiveDemo.Component />
                  </React.Suspense>
                ) : (
                  <Redirect to={`/demo/${defaultDemoName}`} />
                )}
              </DemoWrapper>
            )
          }}
        />

        <Redirect to={`/demo/${defaultDemoName}`} />
      </Switch>
      <DemoPanel>
        {demosEntries.map(([name, { bright }]) => (
          <Spot key={name} to={`/demo/${name}`} title={name} activeClassName="active" className={cx({ bright })} />
        ))}
      </DemoPanel>
    </Router>
  )
}
