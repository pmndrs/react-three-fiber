import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import Intro from './pages/Intro'
import Why from './pages/Why'
import { Global } from './styles'

export default function App() {
  return (
    <Router>
      <Global />
      <Intro />
    </Router>
  )
}
