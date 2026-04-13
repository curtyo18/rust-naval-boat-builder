import './CameraHints.css'

const CONTROLS = [
  { key: 'Left-click drag', action: 'Rotate' },
  { key: 'Scroll', action: 'Zoom' },
  { key: 'Right-click drag', action: 'Pan' },
  { key: 'Ctrl + Z', action: 'Undo' },
  { key: 'Ctrl + Y', action: 'Redo' },
  { key: 'Shift + Click', action: 'Select piece' },
  { key: 'Del', action: 'Delete selected' },
]

export default function CameraHints() {
  return (
    <div className="camera-hints">
      {CONTROLS.map(({ key, action }) => (
        <div key={key} className="camera-hints__row">
          <span className="camera-hints__key">{key}</span>
          <span className="camera-hints__action">{action}</span>
        </div>
      ))}
    </div>
  )
}
