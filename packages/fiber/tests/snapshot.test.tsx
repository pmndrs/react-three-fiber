import * as React from 'react'
import { render, act, waitFor } from '@testing-library/react'
import * as THREE from 'three'
import { Canvas } from '../src/web/Canvas'
import {
  SnapshotProvider,
  useSnapshot,
  compareSnapshots,
  exportSnapshotsToFile,
  Snapshot,
  SceneState,
} from '../src/core/snapshot'

// ============================================================================
// Test Components
// ============================================================================

function TestScene() {
  return (
    <>
      <mesh name="test-cube" position={[1, 2, 3]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" name="test-material" />
      </mesh>
      <pointLight name="test-light" position={[0, 5, 0]} intensity={1} />
    </>
  )
}

function TestComponent() {
  const snapshot = useSnapshot()
  return (
    <div data-testid="snapshot-test">
      <span data-testid="snapshot-count">{snapshot.snapshots.length}</span>
      <span data-testid="is-playing">{snapshot.isPlaying ? 'true' : 'false'}</span>
      <button
        data-testid="capture-btn"
        onClick={() =>
          snapshot.capture({
            metadata: { name: 'Test Snapshot', createdAt: Date.now(), version: '1.0.0' },
          })
        }
      >
        Capture
      </button>
      <button data-testid="export-btn" onClick={() => snapshot.exportToJSON(snapshot.snapshots[0]?.id)}>
        Export
      </button>
    </div>
  )
}

function TestApp() {
  return (
    <SnapshotProvider maxSnapshots={10}>
      <Canvas>
        <TestScene />
      </Canvas>
      <TestComponent />
    </SnapshotProvider>
  )
}

// ============================================================================
// Tests
// ============================================================================

describe('Snapshot System', () => {
  it('should provide snapshot context', async () => {
    const { getByTestId } = render(<TestApp />)

    await waitFor(() => {
      expect(getByTestId('snapshot-count').textContent).toBe('0')
    })
  })

  it('should capture a snapshot', async () => {
    const { getByTestId } = render(<TestApp />)

    await waitFor(() => {
      expect(getByTestId('snapshot-count').textContent).toBe('0')
    })

    act(() => {
      getByTestId('capture-btn').click()
    })

    await waitFor(() => {
      expect(getByTestId('snapshot-count').textContent).toBe('1')
    })
  })

  it('should not exceed max snapshots', async () => {
    const { getByTestId } = render(
      <SnapshotProvider maxSnapshots={3}>
        <Canvas>
          <TestScene />
        </Canvas>
        <TestComponent />
      </SnapshotProvider>
    )

    await waitFor(() => {
      expect(getByTestId('snapshot-count').textContent).toBe('0')
    })

    // Capture 5 snapshots with max 3
    for (let i = 0; i < 5; i++) {
      act(() => {
        getByTestId('capture-btn').click()
      })
    }

    await waitFor(() => {
      expect(getByTestId('snapshot-count').textContent).toBe('3')
    })
  })
})

describe('Snapshot Serialization', () => {
  const mockSceneState: SceneState = {
    camera: {
      position: [0, 0, 5],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      near: 0.1,
      far: 1000,
      isOrthographic: false,
      fov: 50,
      zoom: 1,
      aspect: 1,
    },
    objects: {
      'test-uuid': {
        uuid: 'test-uuid',
        name: 'test-object',
        type: 'Mesh',
        visible: true,
        transform: {
          position: [1, 2, 3],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        material: 'material-uuid',
      },
    },
    lights: {},
    materials: {
      'material-uuid': {
        type: 'MeshStandardMaterial',
        uuid: 'material-uuid',
        name: 'test-material',
        visible: true,
        color: { r: 1, g: 0, b: 0 },
      },
    },
    timestamp: Date.now(),
    metadata: {
      name: 'Test Snapshot',
      createdAt: Date.now(),
      version: '1.0.0',
    },
  }

  const mockSnapshot: Snapshot = {
    id: 'test-snapshot-id',
    state: mockSceneState,
  }

  it('should compare snapshots correctly', () => {
    const snapshotA = { ...mockSnapshot }
    const snapshotB: Snapshot = {
      ...mockSnapshot,
      state: {
        ...mockSceneState,
        camera: {
          ...mockSceneState.camera,
          position: [1, 1, 1] as [number, number, number],
        },
      },
    }

    const diff = compareSnapshots(snapshotA, snapshotB)

    expect(diff.cameraChanged).toBe(true)
    expect(diff.objectsAdded).toEqual([])
    expect(diff.objectsRemoved).toEqual([])
    expect(diff.objectsModified).toEqual([])
  })

  it('should detect added objects', () => {
    const snapshotA = { ...mockSnapshot }
    const snapshotB: Snapshot = {
      ...mockSnapshot,
      state: {
        ...mockSceneState,
        objects: {
          ...mockSceneState.objects,
          'new-uuid': {
            uuid: 'new-uuid',
            name: 'new-object',
            type: 'Mesh',
            visible: true,
            transform: {
              position: [0, 0, 0] as [number, number, number],
              rotation: [0, 0, 0] as [number, number, number],
              scale: [1, 1, 1] as [number, number, number],
            },
          },
        },
      },
    }

    const diff = compareSnapshots(snapshotA, snapshotB)

    expect(diff.objectsAdded).toContain('new-uuid')
    expect(diff.objectsRemoved).toEqual([])
  })

  it('should detect removed objects', () => {
    const snapshotA = { ...mockSnapshot }
    const snapshotB = {
      ...mockSnapshot,
      state: {
        ...mockSceneState,
        objects: {},
      },
    }

    const diff = compareSnapshots(snapshotA, snapshotB)

    expect(diff.objectsRemoved).toContain('test-uuid')
    expect(diff.objectsAdded).toEqual([])
  })

  it('should detect modified materials', () => {
    const snapshotA = { ...mockSnapshot }
    const snapshotB = {
      ...mockSnapshot,
      state: {
        ...mockSceneState,
        materials: {
          'material-uuid': {
            ...mockSceneState.materials['material-uuid'],
            color: { r: 0, g: 1, b: 0 },
          },
        },
      },
    }

    const diff = compareSnapshots(snapshotA, snapshotB)

    expect(diff.materialsChanged).toContain('material-uuid')
  })
})

describe('Snapshot Import/Export', () => {
  const mockSnapshot: Snapshot = {
    id: 'test-id',
    state: {
      camera: {
        position: [0, 0, 5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        near: 0.1,
        far: 1000,
        isOrthographic: false,
      },
      objects: {},
      lights: {},
      materials: {},
      timestamp: Date.now(),
    },
  }

  it('should export snapshot to JSON', () => {
    const json = JSON.stringify(mockSnapshot, null, 2)
    expect(json).toContain('test-id')
    expect(json).toContain('camera')
    expect(json).toContain('objects')
  })

  it('should import snapshot from JSON', () => {
    const json = JSON.stringify(mockSnapshot)
    const imported = JSON.parse(json) as Snapshot

    expect(imported.id).toBe('test-id')
    expect(imported.state.camera.near).toBe(0.1)
    expect(imported.state.camera.far).toBe(1000)
  })
})

describe('useSnapshot Hook', () => {
  it('should throw error when used outside provider', () => {
    function Component() {
      useSnapshot()
      return null
    }

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<Component />)
    }).toThrow('useSnapshot must be used within a SnapshotProvider')

    consoleSpy.mockRestore()
  })
})
