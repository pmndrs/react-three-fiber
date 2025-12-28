import * as React from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

//* Timing Test Component ==============================
function TimingBox() {
  const startTime = React.useRef(performance.now())
  const hasLogged = React.useRef(false)

  useFrame(() => {
    if (!hasLogged.current) {
      hasLogged.current = true
      const elapsed = performance.now() - startTime.current
      console.log(`%c✓ First frame rendered after: ${elapsed.toFixed(2)}ms`, 'color: #00ff00; font-weight: bold')
    }
  })

  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  )
}

//* Main Test ==============================
export default function CanvasDebounceFixed() {
  const [testCase, setTestCase] = React.useState<'default' | 'custom' | 'scroll-off'>('default')

  React.useEffect(() => {
    console.clear()
    console.log('%c========================================', 'color: #ffffff')
    console.log('%cCanvas Debounce Fix Test', 'color: #ffffff; font-size: 16px; font-weight: bold')
    console.log('%c========================================', 'color: #ffffff')
    console.log(`%cTesting: ${testCase}`, 'color: #00ffff; font-weight: bold')
  }, [testCase])

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Canvas Debounce Fix - Verification</h1>
      <p>
        This test verifies that the Canvas now renders immediately without the debounce delay.
        <br />
        All cases should now render in ~5-15ms regardless of debounce settings.
      </p>

      {/* Test Selector */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setTestCase('default')}
          style={{
            padding: '10px',
            fontWeight: testCase === 'default' ? 'bold' : 'normal',
            backgroundColor: testCase === 'default' ? '#4488ff' : '#ddd',
          }}>
          Default Settings
        </button>
        <button
          onClick={() => setTestCase('custom')}
          style={{
            padding: '10px',
            fontWeight: testCase === 'custom' ? 'bold' : 'normal',
            backgroundColor: testCase === 'custom' ? '#ff8844' : '#ddd',
          }}>
          Custom Debounce (2s)
        </button>
        <button
          onClick={() => setTestCase('scroll-off')}
          style={{
            padding: '10px',
            fontWeight: testCase === 'scroll-off' ? 'bold' : 'normal',
            backgroundColor: testCase === 'scroll-off' ? '#44ff88' : '#ddd',
          }}>
          Scroll Disabled
        </button>
      </div>

      {/* Description */}
      <div
        style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px',
        }}>
        {testCase === 'default' && (
          <>
            <strong>Default Settings:</strong> No resize config provided.
            <br />
            Expected: Fast initial render (~5-15ms), then 50ms scroll debounce applies.
          </>
        )}
        {testCase === 'custom' && (
          <>
            <strong>Custom Debounce:</strong> 2 second debounce configured.
            <br />
            Expected: Fast initial render (~5-15ms), then 2s debounce applies to resizes.
            <br />
            <em>Previously this would have delayed initial render by 2 seconds!</em>
          </>
        )}
        {testCase === 'scroll-off' && (
          <>
            <strong>Scroll Disabled:</strong> Scroll tracking disabled.
            <br />
            Expected: Fast initial render (~5-15ms), no scroll tracking.
          </>
        )}
      </div>

      {/* Canvas Test Cases */}
      <div style={{ width: '100%', height: '400px', border: '2px solid #4488ff' }}>
        {testCase === 'default' && (
          <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <TimingBox />
          </Canvas>
        )}

        {testCase === 'custom' && (
          <Canvas resize={{ debounce: 2000 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <TimingBox />
          </Canvas>
        )}

        {testCase === 'scroll-off' && (
          <Canvas resize={{ scroll: false }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <TimingBox />
          </Canvas>
        )}
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <strong>Verification Steps:</strong>
        <ol>
          <li>Open browser console (F12)</li>
          <li>Switch between test cases and observe timing</li>
          <li>All cases should show ~5-15ms initial render time</li>
          <li>Try resizing the window - debounce should work normally after initial render</li>
        </ol>
        <p>
          <strong>The Fix:</strong> Canvas now starts with 0ms debounce for immediate initial size measurement, then
          switches to user-configured debounce settings for subsequent resize/scroll events.
        </p>
      </div>
    </div>
  )
}
