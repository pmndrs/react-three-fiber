import * as React from 'react'
import { type LinkProps, Link } from 'wouter'
// 1. R3F package import karein
import { Canvas } from '@react-three/fiber'

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

// ----------------------------------------------------
// 2. ISSUE #3898 VERIFICATION SNIPPET:
// ----------------------------------------------------
type Issue3898TestProps = {
  Icon?: React.ComponentType<any>
  component?: React.ComponentType<any>
}

export const TestComponent = ({ Icon, component: Component }: Issue3898TestProps) => {
  return (
    <Canvas>
      {Icon && <Icon />}
      {Component && <Component />}
    </Canvas>
  )
}
