import * as React from 'react'
import styled, { createGlobalStyle } from 'styled-components'

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

export { Global, Page }
