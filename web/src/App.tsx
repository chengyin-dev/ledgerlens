import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import ReportPage from './pages/ReportPage'
import UploadPage from './pages/UploadPage'
import './App.css'

function HistoryPage() {
  return (
    <main className="page">
      <div className="page-placeholder">
        <h1>Dataset history</h1>
        <p>Your uploaded datasets will appear here.</p>
      </div>
    </main>
  )
}


function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <NavLink to="/" className="wordmark">
            LedgerLens
          </NavLink>

          <nav className="main-nav" aria-label="Main navigation">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
            >
              Upload
            </NavLink>

            <NavLink
              to="/datasets"
              className={({ isActive }) =>
                `nav-link${isActive ? ' active' : ''}`
              }
            >
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