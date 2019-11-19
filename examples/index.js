import React from 'react'
import ReactDOM from 'react-dom'
import styled, { createGlobalStyle } from 'styled-components'
import { HashRouter as Router } from 'react-router-dom'
import Intro from './pages/Intro'
import Why from './pages/Why'
import { Global } from './styles'

function App() {
  return (
    <Router>
      <Global />
      <Intro />
    </Router>
  )
}

//ReactDOM.createRoot(document.getElementById('root')).render(<App />)
ReactDOM.render(<App />, document.getElementById('root'))
