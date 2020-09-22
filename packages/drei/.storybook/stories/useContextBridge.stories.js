import React from 'react'
import {Canvas} from 'react-three-fiber'
import { withKnobs } from '@storybook/addon-knobs'

import { OrbitControls } from '../../src/controls/OrbitControls'
import { Box } from '../../src/shapes/generated'
import { useContextBridge } from '../../src/misc/useContextBridge'
import { Text } from '../../src/abstractions/Text'

export default {
  title: 'Misc/useContextBridge',
  component: useContextBridge,
  decorators: [
    (storyFn) => storyFn(),
    withKnobs,
  ],
}

const GreetingContext = React.createContext({})
const ThemeContext = React.createContext({})

function Scene() {
  // we can now use the context within the canvas via the regular hook
  const theme = React.useContext(ThemeContext)
  const {greeting, setGreeting} = React.useContext(GreetingContext)
  return <>
    <Box
      position-x={-4}
      args={[3, 2]}
      material-color={theme.colors.red}
      onClick={() => setGreeting(theme.colors.red)}
    />
    <Box
      position-x={0}
      args={[3, 2]}
      material-color={theme.colors.green}
      onClick={() => setGreeting(theme.colors.green)}
    />
    <Box
      position-x={4}
      args={[3, 2]}
      material-color={theme.colors.blue}
      onClick={() => setGreeting(theme.colors.blue)}
    />

    <Text fontSize={0.3} position-z={2}>{greeting ? `Hello ${greeting}!` : 'Click a color'}</Text>
  </>
}

function SceneWrapper() {
  const ContextBridge = useContextBridge(ThemeContext, GreetingContext)
  return (
    <Canvas>
      {/* create the bridge inside the Canvas and forward the context */}
      <ContextBridge>
        <Scene />
      <OrbitControls enablePan={false} zoomSpeed={0.5} />
      </ContextBridge>
    </Canvas>
  )
}

function UseContextBridgeStory() {
  const [greeting, setGreeting] = React.useState(null);
  return (
    // Provide several contexts from above the Canvas
    // This mimics the standard behavior of composing them
    // in the `App.tsx` or `index.tsx` files
    <ThemeContext.Provider value={{colors: {red: '#ff0000', green: '#00ff00', blue: '#0000ff'}}}>
      <GreetingContext.Provider value={{greeting, setGreeting}}>
        <SceneWrapper />
      </GreetingContext.Provider>
    </ThemeContext.Provider>
  )
}

export const UseContextBridgeSt = () => <UseContextBridgeStory />
UseContextBridgeSt.storyName = 'Default'
