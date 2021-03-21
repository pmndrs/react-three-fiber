import React from 'react'
import { HashRouter as Router } from 'react-router-dom'
import Intro from './pages/Intro'
import { Global } from './styles'

export default function App() {
  return (
    <Router>
      <Global />
      <Intro />
    </Router>
  )
}
