import * as React from 'react'
import { type LinkProps, Link } from 'wouter'

export const Page = (props: { children?: React.ReactNode }) => <div {...props} className="Page" />

export const DemoPanel = (props: { children?: React.ReactNode }) => <div {...props} className="DemoPanel" />

export const Dot = (props: React.PropsWithChildren<LinkProps>) => <Link {...props} className="Dot" />

export const Loading = () => {
  return (
    <div className="LoadingContainer">
      <div className="LoadingMessage">Loading.</div>
    </div>
  )
}

export const Error = ({ children }: { children?: React.ReactNode }) => {
  return <div className="Error">{children}</div>
}
