import { BrowserRouter, Routes, Route } from 'react-router-dom'
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
import ProtectedRoute from './components/ProtectedRoute'
import PortalLayout from './layouts/PortalLayout'
import DashboardPage from './pages/portal/DashboardPage'
import ModulePlaceholder from './pages/portal/ModulePlaceholder'
import ConsultationsPage from './pages/portal/ConsultationsPage'
import ConsultationEditorPage from './pages/portal/ConsultationEditorPage'
import ToothChartPage from './pages/portal/ToothChartPage'
import DiagnosesPage from './pages/portal/DiagnosesPage'
import TreatmentPlansPage from './pages/portal/TreatmentPlansPage'
import PrescriptionsPage from './pages/portal/PrescriptionsPage'
import InvestigationsPage from './pages/portal/InvestigationsPage'
import TreatmentRecordsPage from './pages/portal/TreatmentRecordsPage'
import FollowUpsPage from './pages/portal/FollowUpsPage'
import PrescriptionPrintPage from './pages/portal/PrescriptionPrintPage'
import BillingPage from './pages/portal/BillingPage'
import PaymentsPage from './pages/portal/PaymentsPage'
import ServicesPage from './pages/portal/ServicesPage'
import InvoicePrintPage from './pages/portal/InvoicePrintPage'
import ReceiptPrintPage from './pages/portal/ReceiptPrintPage'
import PharmacyPage from './pages/portal/PharmacyPage'
import InventoryPage from './pages/portal/InventoryPage'

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
              <Route
                path="tooth-chart"
                element={
                  <ProtectedRoute roles={['doctor', 'admin']}>
                    <ToothChartPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="diagnoses"
                element={
                  <ProtectedRoute roles={['doctor', 'admin']}>
                    <DiagnosesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="treatment-plans"
                element={
                  <ProtectedRoute roles={['doctor', 'admin']}>
                    <TreatmentPlansPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="prescriptions"
                element={
                  <ProtectedRoute roles={['doctor', 'admin', 'pharmacy', 'receptionist']}>
                    <PrescriptionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="prescriptions/:id/print"
                element={
                  <ProtectedRoute roles={['doctor', 'admin', 'pharmacy', 'receptionist']}>
                    <PrescriptionPrintPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="investigations"
                element={
                  <ProtectedRoute roles={['doctor', 'admin', 'receptionist']}>
                    <InvestigationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="treatment-records"
                element={
                  <ProtectedRoute roles={['doctor', 'admin', 'receptionist']}>
                    <TreatmentRecordsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="follow-ups"
                element={
                  <ProtectedRoute roles={['doctor', 'admin', 'receptionist']}>
                    <FollowUpsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="billing"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}>
                    <BillingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="billing/:id/print"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}>
                    <InvoicePrintPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="payments"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}>
                    <PaymentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="payments/:id/receipt"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}>
                    <ReceiptPrintPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="services"
                element={
                  <ProtectedRoute roles={['admin', 'receptionist', 'doctor']}>
                    <ServicesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="pharmacy"
                element={
                  <ProtectedRoute roles={['admin', 'pharmacy']}>
                    <PharmacyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="inventory"
                element={
                  <ProtectedRoute roles={['admin', 'pharmacy', 'doctor', 'receptionist']}>
                    <InventoryPage />
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