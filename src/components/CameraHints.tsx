import './CameraHints.css'

const CONTROLS = [
  { key: 'Left-click drag', action: 'Rotate' },
  { key: 'Scroll', action: 'Zoom' },
  { key: 'Middle-click drag', action: 'Zoom' },
  { key: 'Ctrl + Left drag', action: 'Pan' },
  { key: 'Right-click drag', action: 'Pan' },
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
