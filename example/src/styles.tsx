import * as React from 'react'
import styled, { createGlobalStyle } from 'styled-components'
import { Link } from 'wouter'

const Page = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;

  & > h1 {
    font-family: 'Roboto', sans-serif;
    font-weight: 900;
    font-size: 8em;
    margin: 0;
    color: white;
    line-height: 0.59em;
    letter-spacing: -2px;
  }

  & > h1 {
    position: absolute;
    top: 70px;
    left: 60px;
  }

  & > span {
    position: absolute;
    bottom: 60px;
    right: 60px;
  }

  @media only screen and (max-width: 1000px) {
    & > h1 {
      font-size: 5em;
      letter-spacing: -1px;
    }
  }

  & > a {
    margin: 0;
    color: white;
    text-decoration: none;
  }
`

const Global = createGlobalStyle`
  @import url('@pmndrs/branding/styles.css');

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
    font-family: 'Inter var', sans-serif;
    color: black;
    background: #2c2d31 !important;
  }

  canvas {
    touch-action: none;
    background: #2c2d31 !important;
  }
`
export const DemoPanel = styled.div`
  position: absolute;
  bottom: 50px;
  left: 50px;
  max-width: 250px;
`

export const Dot = styled(Link)`
  display: inline-block;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin: 8px;
`

const LoadingContainer = styled.div/* css */ `
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;

  background-color: #2c2d31;
  color: white;
`

const LoadingMessage = styled.div/* css */ `
  font-size: 10px;
  font-family: 'Inter', Helvetica, sans-serif;
`

export const Loading = () => {
  return (
    <LoadingContainer>
      <LoadingMessage>Loading.</LoadingMessage>
    </LoadingContainer>
  )
}

export const Error = ({ children }: React.PropsWithChildren<{}>) => {
  return (
    <div
      style={{
        position: 'absolute',
        padding: '10px 20px',
        bottom: 'unset',
        right: 'unset',
        top: 60,
        left: 60,
        maxWidth: 380,
        border: '2px solid #ff5050',
        color: '#ff5050',
      }}>
      {children}
    </div>
  )
}

export { Global, Page }
