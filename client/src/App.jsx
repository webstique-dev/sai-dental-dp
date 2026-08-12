import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AuthProvider from './context/AuthContext'
import RootLayout from './layouts/RootLayout'
import HomePage from './pages/public/HomePage'
import AboutPage from './pages/public/AboutPage'
import TreatmentsPage from './pages/public/TreatmentsPage'
import TreatmentDetailPage from './pages/public/TreatmentDetailPage'
import DoctorsPage from './pages/public/DoctorsPage'
import ReviewsPage from './pages/public/ReviewsPage'
import ContactPage from './pages/public/ContactPage'
import BookAppointmentPage from './pages/public/BookAppointmentPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProtectedRoute from './components/ProtectedRoute'
import PortalLayout from './layouts/PortalLayout'
import DashboardPage from './pages/portal/DashboardPage'
import ModulePlaceholder from './pages/portal/ModulePlaceholder'

const ProfilePage = lazy(() => import('./pages/portal/ProfilePage'))

const ConsultationsPage = lazy(() => import('./pages/portal/ConsultationsPage'))
const ConsultationEditorPage = lazy(() => import('./pages/portal/ConsultationEditorPage'))
const ToothChartPage = lazy(() => import('./pages/portal/ToothChartPage'))
const DiagnosesPage = lazy(() => import('./pages/portal/DiagnosesPage'))
const TreatmentPlansPage = lazy(() => import('./pages/portal/TreatmentPlansPage'))
const PrescriptionsPage = lazy(() => import('./pages/portal/PrescriptionsPage'))
const InvestigationsPage = lazy(() => import('./pages/portal/InvestigationsPage'))
const TreatmentRecordsPage = lazy(() => import('./pages/portal/TreatmentRecordsPage'))
const FollowUpsPage = lazy(() => import('./pages/portal/FollowUpsPage'))
const PrescriptionPrintPage = lazy(() => import('./pages/portal/PrescriptionPrintPage'))
const BillingPage = lazy(() => import('./pages/portal/BillingPage'))
const PaymentsPage = lazy(() => import('./pages/portal/PaymentsPage'))
const ServicesPage = lazy(() => import('./pages/portal/ServicesPage'))
const InvoicePrintPage = lazy(() => import('./pages/portal/InvoicePrintPage'))
const ReceiptPrintPage = lazy(() => import('./pages/portal/ReceiptPrintPage'))
const PharmacyPage = lazy(() => import('./pages/portal/PharmacyPage'))
const InventoryPage = lazy(() => import('./pages/portal/InventoryPage'))
const PatientsPage = lazy(() => import('./pages/portal/PatientsPage'))
const AppointmentsPage = lazy(() => import('./pages/portal/AppointmentsPage'))
const CheckInPage = lazy(() => import('./pages/portal/CheckInPage'))
const ReportsPage = lazy(() => import('./pages/portal/ReportsPage'))
const UsersPage = lazy(() => import('./pages/portal/UsersPage'))
const SettingsPage = lazy(() => import('./pages/portal/SettingsPage'))

function PageFallback() {
  return (
    <div className="page-fallback" role="status" aria-live="polite">
      <span>Loading…</span>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<HomePage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="treatments" element={<TreatmentsPage />} />
            <Route path="treatments/:slug" element={<TreatmentDetailPage />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="book" element={<BookAppointmentPage />} />
            <Route path="*" element={<HomePage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<DashboardPage />} />
              <Route
                path="profile"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <ProfilePage />
                  </Suspense>
                }
              />
              <Route
                path="consultations"
                element={
                  <ProtectedRoute roles={['doctor', 'admin']}>
                    <Suspense fallback={<PageFallback />}>
                      <ConsultationsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="consultations/:id"
                element={
                  <ProtectedRoute roles={['doctor', 'admin']}>
                    <Suspense fallback={<PageFallback />}>
                      <ConsultationEditorPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="tooth-chart"
                element={
                  <ProtectedRoute roles={['doctor', 'admin']}>
                    <Suspense fallback={<PageFallback />}>
                      <ToothChartPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="diagnoses"
                element={
                  <ProtectedRoute roles={['doctor', 'admin']}>
                    <Suspense fallback={<PageFallback />}>
                      <DiagnosesPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="treatment-plans"
                element={
                  <ProtectedRoute roles={['doctor', 'admin']}>
                    <Suspense fallback={<PageFallback />}>
                      <TreatmentPlansPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="prescriptions"
                element={
                  <ProtectedRoute roles={['doctor', 'admin', 'pharmacy', 'receptionist']}>
                    <Suspense fallback={<PageFallback />}>
                      <PrescriptionsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="prescriptions/:id/print"
                element={
                  <ProtectedRoute roles={['doctor', 'admin', 'pharmacy', 'receptionist']}>
                    <Suspense fallback={<PageFallback />}>
                      <PrescriptionPrintPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="investigations"
                element={
                  <ProtectedRoute roles={['doctor', 'admin', 'receptionist']}>
                    <Suspense fallback={<PageFallback />}>
                      <InvestigationsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="treatment-records"
                element={
                  <ProtectedRoute roles={['doctor', 'admin', 'receptionist']}>
                    <Suspense fallback={<PageFallback />}>
                      <TreatmentRecordsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="follow-ups"
                element={
                  <ProtectedRoute roles={['doctor', 'admin', 'receptionist']}>
                    <Suspense fallback={<PageFallback />}>
                      <FollowUpsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="billing"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}>
                    <Suspense fallback={<PageFallback />}>
                      <BillingPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="billing/:id/print"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}>
                    <Suspense fallback={<PageFallback />}>
                      <InvoicePrintPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="payments"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}>
                    <Suspense fallback={<PageFallback />}>
                      <PaymentsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="payments/:id/receipt"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}>
                    <Suspense fallback={<PageFallback />}>
                      <ReceiptPrintPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="services"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}>
                    <Suspense fallback={<PageFallback />}>
                      <ServicesPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="pharmacy"
                element={
                  <ProtectedRoute roles={['admin', 'pharmacy']}>
                    <Suspense fallback={<PageFallback />}>
                      <PharmacyPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="inventory"
                element={
                  <ProtectedRoute roles={['admin', 'pharmacy', 'doctor', 'receptionist']}>
                    <Suspense fallback={<PageFallback />}>
                      <InventoryPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="patients"
                element={
                  <ProtectedRoute roles={['admin', 'doctor', 'receptionist']}>
                    <Suspense fallback={<PageFallback />}>
                      <PatientsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="appointments"
                element={
                  <ProtectedRoute roles={['admin', 'doctor', 'receptionist']}>
                    <Suspense fallback={<PageFallback />}>
                      <AppointmentsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="check-in"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist']}>
                    <Suspense fallback={<PageFallback />}>
                      <CheckInPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}>
                    <Suspense fallback={<PageFallback />}>
                      <ReportsPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Suspense fallback={<PageFallback />}>
                      <UsersPage />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Suspense fallback={<PageFallback />}>
                      <SettingsPage />
                    </Suspense>
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