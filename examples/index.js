import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/Tina'
import './styles.css'

console.log(ReactDOM)

ReactDOM.unstable_createRoot(document.getElementById('root')).render(<App />)
//ReactDOM.render(<App />, document.getElementById('root'))
