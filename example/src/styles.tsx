import * as React from 'react'
import { Link, LinkProps } from 'wouter'
// import '@pmndrs/branding/styles.css'
import './styles.css'

type DivProps = Partial<React.PropsWithChildren<JSX.IntrinsicElements['div']>>

export const Page = (props: DivProps) => <div {...props} className="Page" />

export const DemoPanel = (props: DivProps) => <div {...props} className="DemoPanel" />

export const Dot = (props: LinkProps) => <Link {...props} className="Dot" />

const LoadingContainer = (props: DivProps) => <div {...props} className="LoadingContainer" />

const LoadingMessage = (props: DivProps) => <div {...props} className="LoadingMessage" />

export const Loading = () => (
  <LoadingContainer>
    <LoadingMessage>Loading.</LoadingMessage>
  </LoadingContainer>
)

export const Error = (props: DivProps) => <div {...props} className="StyledError" />
