import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import HistoryPage from './pages/HistoryPage'
import ReportPage from './pages/ReportPage'
import UploadPage from './pages/UploadPage'
import './App.css'

const navClass = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <NavLink to="/" className="wordmark">
            LedgerLens
          </NavLink>

          <nav className="main-nav" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              Upload
            </NavLink>
            {/* Not "end", so History stays highlighted on a report page. */}
            <NavLink to="/datasets" className={navClass}>
              History
            </NavLink>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/datasets" element={<HistoryPage />} />
        <Route path="/datasets/:id" element={<ReportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App