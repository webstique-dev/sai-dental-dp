import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthProvider from './context/AuthContext'
import RootLayout from './layouts/RootLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import PortalLayout from './layouts/PortalLayout'
import DashboardPage from './pages/portal/DashboardPage'
import ModulePlaceholder from './pages/portal/ModulePlaceholder'
import ConsultationsPage from './pages/portal/ConsultationsPage'
import ConsultationEditorPage from './pages/portal/ConsultationEditorPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<HomePage />} />
            <Route path="*" element={<HomePage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<DashboardPage />} />
              <Route
                path="consultations"
                element={
                  <ProtectedRoute roles={['doctor', 'admin']}>
                    <ConsultationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="consultations/:id"
                element={
                  <ProtectedRoute roles={['doctor', 'admin']}>
                    <ConsultationEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route path=":module" element={<ModulePlaceholder />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}