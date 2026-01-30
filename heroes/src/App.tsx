import { Routes, Route, Link, useParams } from 'react-router-dom'
import { Suspense, lazy } from 'react'

// Demo metadata for the home page
export const demos = [
  // Tier 1: High Impact
  {
    id: 'splash',
    name: 'Splash',
    description: 'Ghibli Style Waterfall Effect',
    features: ['Multi-Canvas', 'Scheduler', 'HTML Integration'],
    tier: 1,
  },
  {
    id: 'layered-reality',
    name: 'Layered Reality',
    description:
      '3D website where HTML sits BETWEEN two 3D layers. True depth perception impossible with single canvas.',
    features: ['Multi-Canvas', 'Scheduler', 'HTML Integration'],
    tier: 1,
  },
  {
    id: 'fluid-bottle',
    name: 'HL2 Fluid Bottle',
    description: 'Classic Half-Life 2 fluid simulation in a bottle. Tilt to see satisfying fluid physics.',
    features: ['useBuffers', 'useNodes', 'TSL Compute'],
    tier: 1,
  },
  {
    id: 'volumetric-clouds',
    name: 'Volumetric Cloudscape',
    description: 'Fly through volumetric clouds with 3D noise textures. Time-of-day slider changes lighting.',
    features: ['useGPUStorage', 'useNodes', 'TSL Raymarching'],
    tier: 1,
  },
  {
    id: 'flashlight-maze',
    name: 'Flashlight Maze',
    description: 'First-person horror maze with camera-attached flashlight. Uses onOccluded for scares.',
    features: ['Portal', 'Camera Parenting', 'onOccluded'],
    tier: 1,
  },
  {
    id: 'mission-control',
    name: 'Mission Control',
    description: 'Main scene with 4 smaller viewports (minimap, rear camera, stats, radar) at different fps.',
    features: ['Multi-Canvas', 'primaryStore', 'FPS Throttling'],
    tier: 1,
  },

  // Tier 2: Strong Demos
  {
    id: 'terrain-table',
    name: 'Terrain Table',
    description: 'Miniature procedural terrain on a desk. Erodes/generates in real-time at throttled fps.',
    features: ['useNodes', 'useBuffers', 'Scheduler Phases'],
    tier: 2,
  },
  {
    id: 'piano-keys',
    name: 'Piano Keys',
    description: 'Interactive piano with proper multi-touch. Multiple fingers play multiple keys.',
    features: ['Per-Pointer State', 'Multi-Touch Events'],
    tier: 2,
  },
  {
    id: 'security-cameras',
    name: 'Security Cameras',
    description: 'Room with 4 security monitors showing live feeds from different angles.',
    features: ['useRenderTarget', 'Multi-Viewport'],
    tier: 2,
  },
  {
    id: 'magic-mirror',
    name: 'Magic Mirror',
    description: 'Mirror showing reflection with a twist - different lighting, time, or style.',
    features: ['Portal', 'useRenderTarget', 'Camera'],
    tier: 2,
  },
  {
    id: 'morphing-gallery',
    name: 'Morphing Gallery',
    description: 'Art gallery where sculptures morph between forms. Click to cycle.',
    features: ['useNodes', 'fromRef', 'once'],
    tier: 2,
  },

  // Tier 3: Feature-Focused
  {
    id: 'frame-budget',
    name: 'Frame Budget Visualizer',
    description: 'Debug panel showing frame budget. Toggle systems, change fps, see impact.',
    features: ['Scheduler Phases', 'FPS Throttling', 'Pause/Resume'],
    tier: 3,
  },
  {
    id: 'lazy-city',
    name: 'Lazy City',
    description: 'Large city where buildings only animate/load when visible. Counter shows active objects.',
    features: ['onFramed', 'onVisible', 'Frustum'],
    tier: 3,
  },
  {
    id: 'depth-sorting',
    name: 'Depth Sorting Demo',
    description: 'Transform gizmo over objects. Gizmo handles always clickable regardless of depth.',
    features: ['interactivePriority'],
    tier: 3,
  },
  {
    id: 'export-studio',
    name: '4K Export Studio',
    description: 'Compose a scene, click "Export 4K" - canvas renders at 4K for capture.',
    features: ['width/height', 'setSize', 'dpr'],
    tier: 3,
  },
  {
    id: 'environment-mixer',
    name: 'Environment Mixer',
    description: 'Object viewer with environment selector. Crossfade between presets.',
    features: ['background prop', 'Presets', 'HDRI'],
    tier: 3,
  },

  // Tier 4: Creative / Artistic
  {
    id: 'synced-swimmers',
    name: 'Synced Swimmers',
    description: 'Same animation across 3 canvases with intentional delay. Creates wave effect.',
    features: ['Multi-Canvas', 'scheduler after'],
    tier: 4,
  },
  {
    id: 'shader-playground',
    name: 'Shader Playground',
    description: 'Live code editor for TSL with instant preview. Edit shader, see changes immediately.',
    features: ['HMR', 'useNodes', 'useUniforms'],
    tier: 4,
  },
  {
    id: 'occlusion-reveal',
    name: 'Occlusion Reveal',
    description: 'Hidden messages only visible when occluded. "Look away to see the secret."',
    features: ['onOccluded'],
    tier: 4,
  },
  {
    id: 'procedural-coral',
    name: 'Procedural Coral',
    description: 'Growing coral reef. Branches grow based on compute shader rules.',
    features: ['useBuffers', 'useNodes', 'Compute'],
    tier: 4,
  },
  {
    id: 'gravity-well',
    name: 'Gravity Well',
    description: 'Particle system with multiple gravity wells. Drag wells around.',
    features: ['useBuffers', 'useNodes', 'Compute'],
    tier: 4,
  },

  // Tier 5: Quick Wins
  {
    id: 'spotlight-rig',
    name: 'fromRef Spotlight Rig',
    description: 'Stage with multiple spotlights following moving targets. All declarative.',
    features: ['fromRef'],
    tier: 5,
  },
  {
    id: 'geometry-prep',
    name: 'Geometry Prep',
    description: 'Complex geometry with pre-applied transforms. Shows once() preventing re-application.',
    features: ['once'],
    tier: 5,
  },
  {
    id: 'battery-saver',
    name: 'Battery Saver Mode',
    description: 'Toggle that drops all animations to 15fps. Battery icon fills slower.',
    features: ['scheduler fps'],
    tier: 5,
  },
  {
    id: 'headlights-drive',
    name: 'Headlights Drive',
    description: 'Simple driving scene at night. Headlights attached to camera.',
    features: ['Portal', 'Camera Parenting'],
    tier: 5,
  },
  {
    id: 'split-screen',
    name: 'Split Screen Racing',
    description: 'Two players, split screen, shared scene, independent cameras.',
    features: ['Multi-Canvas', 'Scheduler'],
    tier: 5,
  },
]

// Lazy load demo components
const demoComponents: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  'layered-reality': lazy(() => import('./demos/LayeredReality')),
  'fluid-bottle': lazy(() => import('./demos/FluidBottle')),
  'volumetric-clouds': lazy(() => import('./demos/VolumetricClouds')),
  'flashlight-maze': lazy(() => import('./demos/FlashlightMaze')),
  'mission-control': lazy(() => import('./demos/MissionControl')),
  'terrain-table': lazy(() => import('./demos/TerrainTable')),
  'piano-keys': lazy(() => import('./demos/PianoKeys')),
  'security-cameras': lazy(() => import('./demos/SecurityCameras')),
  'magic-mirror': lazy(() => import('./demos/MagicMirror')),
  'morphing-gallery': lazy(() => import('./demos/MorphingGallery')),
  'frame-budget': lazy(() => import('./demos/FrameBudget')),
  'lazy-city': lazy(() => import('./demos/LazyCity')),
  'depth-sorting': lazy(() => import('./demos/DepthSorting')),
  'export-studio': lazy(() => import('./demos/ExportStudio')),
  'environment-mixer': lazy(() => import('./demos/EnvironmentMixer')),
  'synced-swimmers': lazy(() => import('./demos/SyncedSwimmers')),
  'shader-playground': lazy(() => import('./demos/ShaderPlayground')),
  'occlusion-reveal': lazy(() => import('./demos/OcclusionReveal')),
  'procedural-coral': lazy(() => import('./demos/ProceduralCoral')),
  'gravity-well': lazy(() => import('./demos/GravityWell')),
  'spotlight-rig': lazy(() => import('./demos/SpotlightRig')),
  'geometry-prep': lazy(() => import('./demos/GeometryPrep')),
  'battery-saver': lazy(() => import('./demos/BatterySaver')),
  'headlights-drive': lazy(() => import('./demos/HeadlightsDrive')),
  'split-screen': lazy(() => import('./demos/SplitScreen')),
  splash: lazy(() => import('./demos/Splash')),
}

const tierNames = {
  1: 'High Impact',
  2: 'Strong Demos',
  3: 'Feature-Focused',
  4: 'Creative / Artistic',
  5: 'Quick Wins',
}

function Home() {
  const grouped = demos.reduce(
    (acc, demo) => {
      acc[demo.tier] = acc[demo.tier] || []
      acc[demo.tier].push(demo)
      return acc
    },
    {} as Record<number, typeof demos>,
  )

  return (
    <div className="home">
      <h1>R3F v10 Hero Demos</h1>
      <p className="subtitle">25 showcases demonstrating React Three Fiber v10 features</p>

      {[1, 2, 3, 4, 5].map((tier) => (
        <div key={tier} className="tier-section">
          <h2 className="tier-title">
            Tier {tier}: {tierNames[tier as keyof typeof tierNames]}
          </h2>
          <div className="demo-grid">
            {grouped[tier]?.map((demo) => (
              <Link key={demo.id} to={`/demo/${demo.id}`} className="demo-card">
                <h3>{demo.name}</h3>
                <p>{demo.description}</p>
                <div className="features">
                  {demo.features.map((feature) => (
                    <span key={feature} className="feature">
                      {feature}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DemoWrapper({ id }: { id: string }) {
  const Component = demoComponents[id]
  const demo = demos.find((d) => d.id === id)

  if (!Component || !demo) {
    return (
      <div className="home">
        <h1>Demo not found</h1>
        <Link to="/" className="back-button">
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="demo-container">
      <Suspense fallback={<div className="home">Loading...</div>}>
        <Component />
      </Suspense>
      <div className="demo-info">
        <h2>{demo.name}</h2>
        <p>{demo.description}</p>
        <div className="tags">
          {demo.features.map((f) => (
            <span key={f} className="tag">
              {f}
            </span>
          ))}
        </div>
      </div>
      <Link to="/" className="back-button">
        ← Back
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/demo/:id" element={<DemoRoute />} />
    </Routes>
  )
}

function DemoRoute() {
  const { id } = useParams<{ id: string }>()
  return <DemoWrapper id={id || ''} />
}
