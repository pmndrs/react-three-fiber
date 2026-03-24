import * as React from 'react'
import { createPortal } from 'react-dom'
import type { Snapshot, SnapshotSystemOptions } from './types'
import { useSnapshot } from './useSnapshot'
import { useThree } from '../hooks'

export interface SnapshotPanelProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  options?: SnapshotSystemOptions
  onSnapshotTake?: (snapshot: Snapshot) => void
  onSnapshotApply?: (snapshot: Snapshot) => void
  onSnapshotDelete?: (snapshotId: string) => void
  onExport?: (json: string) => void
  onImport?: (snapshots: Snapshot[]) => void
}

export const SnapshotPanel: React.FC<SnapshotPanelProps> = ({
  position = 'top-right',
  options,
  onSnapshotTake,
  onSnapshotApply,
  onSnapshotDelete,
  onExport,
  onImport,
}) => {
  const { gl } = useThree()
  const {
    snapshots,
    currentSnapshot,
    takeSnapshot,
    applySnapshot,
    deleteSnapshot,
    clearSnapshots,
    renameSnapshot,
    exportToJson,
    importFromJson,
  } = useSnapshot(options)

  const [newSnapshotName, setNewSnapshotName] = React.useState('')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editingName, setEditingName] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [portalRoot, setPortalRoot] = React.useState<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const container = gl.domElement.parentElement
    if (!container) return

    let root = container.querySelector<HTMLDivElement>('.r3f-snapshot-panel-root')
    if (!root) {
      root = document.createElement('div')
      root.className = 'r3f-snapshot-panel-root'
      root.style.position = 'absolute'
      root.style.top = '0'
      root.style.left = '0'
      root.style.width = '100%'
      root.style.height = '100%'
      root.style.pointerEvents = 'none'
      root.style.zIndex = '100'
      container.appendChild(root)
    }
    setPortalRoot(root)

    return () => {
      if (root && root.childElementCount === 0) {
        root.remove()
      }
    }
  }, [gl])

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
  }

  const handleTakeSnapshot = () => {
    const snapshot = takeSnapshot(newSnapshotName || undefined, options)
    setNewSnapshotName('')
    onSnapshotTake?.(snapshot)
  }

  const handleApplySnapshot = (snapshot: Snapshot) => {
    applySnapshot(snapshot)
    onSnapshotApply?.(snapshot)
  }

  const handleDeleteSnapshot = (snapshotId: string) => {
    deleteSnapshot(snapshotId)
    onSnapshotDelete?.(snapshotId)
  }

  const handleRenameSnapshot = (snapshotId: string) => {
    if (editingName.trim()) {
      renameSnapshot(snapshotId, editingName.trim())
    }
    setEditingId(null)
    setEditingName('')
  }

  const handleExport = () => {
    const json = exportToJson()
    onExport?.(json)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `snapshots-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        importFromJson(content)
      }
      reader.readAsText(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString()
  }

  if (!portalRoot) return null

  const panelContent = (
    <div
      style={{
        position: 'absolute',
        ...positionStyles[position],
        background: 'rgba(0, 0, 0, 0.85)',
        borderRadius: '8px',
        padding: '16px',
        width: '280px',
        maxHeight: '500px',
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'auto',
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
        📸 Snapshot System
      </h3>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Snapshot name..."
          value={newSnapshotName}
          onChange={(e) => setNewSnapshotName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleTakeSnapshot()}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #444',
            borderRadius: '4px',
            background: '#222',
            color: 'white',
            fontSize: '12px',
          }}
        />
        <button
          onClick={handleTakeSnapshot}
          style={{
            padding: '8px 16px',
            background: '#4a90d9',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
          }}
        >
          📷 Take
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={handleExport}
          disabled={snapshots.length === 0}
          style={{
            flex: 1,
            padding: '8px',
            background: snapshots.length === 0 ? '#444' : '#28a745',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: snapshots.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '12px',
          }}
        >
          📤 Export
        </button>
        <label
          style={{
            flex: 1,
            padding: '8px',
            background: '#6c757d',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            textAlign: 'center',
          }}
        >
          📥 Import
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {snapshots.length > 0 && (
        <button
          onClick={clearSnapshots}
          style={{
            padding: '6px',
            background: '#dc3545',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '11px',
            marginBottom: '12px',
          }}
        >
          🗑️ Clear All ({snapshots.length})
        </button>
      )}

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {snapshots.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '20px',
              color: '#888',
              fontSize: '12px',
            }}
          >
            No snapshots yet.
            <br />
            Click "Take" to capture the current scene state.
          </div>
        ) : (
          snapshots.map((snapshot, index) => (
            <div
              key={snapshot.id}
              style={{
                background: currentSnapshot?.id === snapshot.id ? '#4a90d9' : '#333',
                borderRadius: '6px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    color: '#aaa',
                    background: '#222',
                    padding: '2px 6px',
                    borderRadius: '3px',
                  }}
                >
                  #{index + 1}
                </span>
                {editingId === snapshot.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleRenameSnapshot(snapshot.id)}
                    onKeyPress={(e) => e.key === 'Enter' && handleRenameSnapshot(snapshot.id)}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      border: '1px solid #666',
                      borderRadius: '3px',
                      background: '#222',
                      color: 'white',
                      fontSize: '12px',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                    }}
                    onDoubleClick={() => {
                      setEditingId(snapshot.id)
                      setEditingName(snapshot.name)
                    }}
                  >
                    {snapshot.name}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '10px', color: '#aaa' }}>
                  {formatTime(snapshot.timestamp)}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => handleApplySnapshot(snapshot)}
                    style={{
                      padding: '4px 8px',
                      background: '#28a745',
                      border: 'none',
                      borderRadius: '3px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '10px',
                    }}
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => handleDeleteSnapshot(snapshot.id)}
                    style={{
                      padding: '4px 8px',
                      background: '#dc3545',
                      border: 'none',
                      borderRadius: '3px',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '10px',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  return createPortal(panelContent, portalRoot)
}
