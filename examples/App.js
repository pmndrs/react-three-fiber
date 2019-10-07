import React, { Suspense, useState } from 'react'
import * as components from './components'
import styled, { createGlobalStyle } from 'styled-components'

export default function() {
  const [active, set] = useState(Object.values(components)[0])
  return (
    <>
      <Global />
      <Grid>
        <Panel active={active} set={set} />
        <Content>
          <Suspense fallback={null}>
            <active.Component />
          </Suspense>
        </Content>
      </Grid>
    </>
  )
}

function Panel({ active, set }) {
  return (
    <PanelContainer>
      {Object.entries(components).map(([name, item]) => (
        <div key={name} style={{ color: active === item ? 'indianred' : 'inherit' }} onClick={e => set(item)}>
          {name}
        </div>
      ))}
    </PanelContainer>
  )
}

const Grid = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  display: grid;
  grid-template-columns: 300px 1fr;
`

const PanelContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  padding: 25px;
  & > div {
    cursor: pointer;
  }
  & > div:hover {
    color: indianred;
  }
`

const Content = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #272727;
`

const Global = createGlobalStyle`
  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    overflow: hidden;
  }

  #root {
    overflow: auto;
  }

  body {
    position: fixed;
    overflow: hidden;
    overscroll-behavior-y: none;
    font-family: -apple-system, BlinkMacSystemFont, avenir next, avenir, helvetica neue, helvetica, ubuntu, roboto, noto,
      segoe ui, arial, sans-serif;
    color: black;
    -webkit-font-smoothing: antialiased;
  }

  canvas {
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    overflow: hidden;
  }
`
