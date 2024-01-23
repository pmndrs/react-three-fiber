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
    background: #dedddf !important;
  }

  canvas {
    touch-action: none;
  }

  .container {
    position: relative;
    width: 100%;
    height: 100%;
  }
  
  .text {
    line-height: 1em;
    text-align: left;
    font-size: 8em;
    word-break: break-word;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
`
export const DemoPanel = styled.div`
  z-index: 1000;
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

const LoadingContainer = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;

  background-color: #dedddf;
  color: white;
`

const LoadingMessage = styled.div`
  font-family: 'Inter', Helvetica, sans-serif;
`

export const Loading = () => {
  return (
    <LoadingContainer>
      <LoadingMessage>Loading.</LoadingMessage>
    </LoadingContainer>
  )
}

const StyledError = styled.div`
  position: absolute;
  padding: 10px 20px;
  bottom: unset;
  right: unset;
  top: 60px;
  left: 60px;
  max-width: 380px;
  border: 2px solid #ff5050;
  color: #ff5050;
`

export const Error = ({ children }: React.PropsWithChildren<{}>) => {
  return <StyledError>{children}</StyledError>
}

export { Global, Page }
