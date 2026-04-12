import './App.css'

export default function App() {
  return (
    <div className="app">
      <div style={{ height: 44, background: '#111', borderBottom: '1px solid #333' }}>TopBar placeholder</div>
      <div className="app__body">
        <div style={{ width: 160, background: '#141414', borderRight: '1px solid #333' }}>Sidebar placeholder</div>
        <div className="app__viewport" style={{ background: '#1a1a2e' }}>Viewport placeholder</div>
      </div>
      <div style={{ height: 36, background: '#111', borderTop: '1px solid #333' }}>CostBar placeholder</div>
    </div>
  )
}
