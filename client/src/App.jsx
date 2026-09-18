import { Navigate, Route, Routes } from 'react-router-dom'
import MarketingPage from './pages/marketing/MarketingPage'
import TermsPage from './pages/marketing/TermsPage'
import LoginPage from './pages/auth/LoginPage'
import PortalRouter from './pages/portal/PortalRouter'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MarketingPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/portal/*"
        element={
          <ProtectedRoute>
            <PortalRouter />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
