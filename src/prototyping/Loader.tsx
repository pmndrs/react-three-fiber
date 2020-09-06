import React from 'react'
import { useProgress } from '../loaders/useProgress'
import { a, useTransition } from '@react-spring/web'

const styles = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: '#171717',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  inner: {
    width: 100,
    height: 3,
    background: '#272727',
  },
  bar: {
    height: 3,
    background: 'white',
  },
  data: {
    display: 'inline-block',
    position: 'relative',
    fontVariantNumeric: 'tabular-nums',
    marginTop: '0.8em',
    color: '#f0f0f0',
    fontSize: '0.6em',
    fontFamily: `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", "Helvetica Neue", Helvetica, Arial, Roboto, Ubuntu, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
    whiteSpace: 'nowrap',
  },
}

export function Loader({
  containerStyles,
  innerStyles,
  barStyles,
  dataStyles,
  dataInterpolation = (p: number) => `Loading ${p.toFixed(2)}%`,
  initialState = (active: boolean) => active,
}) {
  const { active, progress } = useProgress()
  const transition = useTransition(initialState(active), {
    from: { opacity: 1, progress: 0 },
    leave: { opacity: 0 },
    update: { progress },
  })
  return transition(
    ({ progress, opacity }, active) =>
      active && (
        <a.div style={{ ...styles.container, opacity, ...containerStyles }}>
          <div style={{ ...styles.inner, ...innerStyles }}>
            <a.div style={{ ...styles.bar, width: progress, ...barStyles }}>
              <a.span style={{ ...styles.data, ...dataStyles }}>{progress.to(dataInterpolation)}</a.span>
            </a.div>
          </div>
        </a.div>
      )
  )
}
