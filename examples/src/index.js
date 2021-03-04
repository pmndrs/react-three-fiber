import React from 'react'
import './styles.css'
import { render } from '../../src/web'
import App from './App'

render(<App />, document.getElementById('canvas'), {
  gl: { alpha: false },
  size: { width: 400, height: 400 },
})
