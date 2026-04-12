// src/App.tsx
import './App.css'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import CostBar from './components/CostBar'
import Viewport from './scene/Viewport'

export default function App() {
  return (
    <div className="app">
      <TopBar />
      <div className="app__body">
        <Sidebar />
        <div className="app__viewport">
          <Viewport />
        </div>
      </div>
      <CostBar />
    </div>
  )
}
