import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  UserPlus,
  CalendarPlus,
  UserCheck,
  CreditCard,
  BarChart2,
  Users,
  DollarSign,
  Clock,
  IndianRupee,
  Package,
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  Stethoscope,
  Play,
  User,
  Calendar,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth'
import { getReceptionistSummary, getDashboardAnalytics } from '../../services/reportsService'
import { listPatients } from '../../services/patientService'
import { listAppointments } from '../../services/appointmentService'
import { getQueueList } from '../../services/checkInService'
import { createConsultation } from '../../services/consultationService'
import { LineChartCard, BarChartCard, PieChartCard } from '../../components/reports/charts'
import { formatCurrency, formatNumber } from '../../utils/chartTheme'
import { DashboardSkeleton } from '../../components/common/skeleton'

const PERIODS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isDoctor = user?.role === 'doctor'
  const isReceptionist = user?.role === 'receptionist'
  const isAdmin = user?.role === 'admin'

  const doctorId = user?._id || user?.id || ''
  const todayStr = new Date().toISOString().split('T')[0]

  // Doctor state
  const [docPatients, setDocPatients] = useState([])
  const [docAppts, setDocAppts] = useState([])
  const [docQueue, setDocQueue] = useState([])
  const [docLoading, setDocLoading] = useState(false)

  // Receptionist state
  const [recPatients, setRecPatients] = useState([])
  const [recAppts, setRecAppts] = useState([])
  const [recQueue, setRecQueue] = useState([])
  const [recLoading, setRecLoading] = useState(false)

  // Admin state
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('30d')
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [error, setError] = useState('')

  const ensureArray = (val) => {
    if (!val) return []
    if (Array.isArray(val)) return val
    if (typeof val === 'object') {
      if (Array.isArray(val.items)) return val.items
      if (Array.isArray(val.appointments)) return val.appointments
      if (Array.isArray(val.visits)) return val.visits
      if (Array.isArray(val.patients)) return val.patients
      if (Array.isArray(val.data?.items)) return val.data.items
      if (Array.isArray(val.data)) return val.data
    }
    return []
  }

  // Fetch Doctor Data
  const fetchDoctorData = useCallback(async () => {
    if (!isDoctor || !doctorId) return
    setDocLoading(true)
    try {
      const [patRes, apptRes, queueRes] = await Promise.all([
        listPatients({ doctorId }),
        listAppointments({ doctor: doctorId }),
        getQueueList({ doctor: doctorId, date: todayStr }),
      ])
      setDocPatients(ensureArray(patRes))
      setDocAppts(ensureArray(apptRes))
      setDocQueue(ensureArray(queueRes))
    } catch (err) {
      console.error('Failed to load doctor dashboard data:', err)
    } finally {
      setDocLoading(false)
    }
  }, [isDoctor, doctorId, todayStr])

  // Fetch Receptionist Data
  const fetchReceptionistData = useCallback(async () => {
    if (!isReceptionist) return
    setRecLoading(true)
    try {
      const [patRes, apptRes, queueRes] = await Promise.all([
        listPatients({ limit: 100 }),
        listAppointments({ date: todayStr }),
        getQueueList({ date: todayStr }),
      ])
      setRecPatients(ensureArray(patRes))
      setRecAppts(ensureArray(apptRes))
      setRecQueue(ensureArray(queueRes))
    } catch (err) {
      console.error('Failed to load receptionist dashboard data:', err)
    } finally {
      setRecLoading(false)
    }
  }, [isReceptionist, todayStr])

  // Fetch Admin Data
  const fetchAnalytics = useCallback(() => {
    if (!isAdmin) return
    setAnalyticsLoading(true)
    setError('')
    getDashboardAnalytics({ period })
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Failed to load analytics'))
      .finally(() => setAnalyticsLoading(false))
  }, [isAdmin, period])

  useEffect(() => {
    if (isDoctor) fetchDoctorData()
    if (isReceptionist) fetchReceptionistData()
    if (isAdmin) fetchAnalytics()
  }, [isDoctor, isReceptionist, isAdmin, fetchDoctorData, fetchReceptionistData, fetchAnalytics])

  const handleOpenConsultation = async (patientId, visitId = null) => {
    try {
      const res = await createConsultation({ patientId, visitId })
      const cons = res.consultation
      navigate(`/portal/consultations/${cons._id || cons.id}`)
    } catch (err) {
      console.error('Failed to open consultation:', err)
    }
  }

  // ── 1. DOCTOR DASHBOARD VIEW ──
  if (isDoctor) {
    const safePatients = ensureArray(docPatients)
    const safeAppts = ensureArray(docAppts)
    const safeQueue = ensureArray(docQueue)

    const todayAppts = safeAppts.filter((a) => (a.date || '').startsWith(todayStr))
    const upcomingAppts = safeAppts.filter((a) => (a.date || '') > todayStr && a.status !== 'completed' && a.status !== 'cancelled')
    const waitingQueue = safeQueue.filter((v) => v.status === 'registered' || v.status === 'in-progress')
    const completedToday = todayAppts.filter((a) => a.status === 'completed').concat(safeQueue.filter((v) => v.status === 'completed'))

    return (
      <div className="portal-page">
        {/* Doctor Profile Banner */}
        <div className="card mb-6" style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '24px', borderLeft: '5px solid var(--color-forest)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(26,60,43,0.1)', color: 'var(--color-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Stethoscope size={28} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--color-forest)' }}>
                  {user.name}
                </h1>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-primary">{user.specialization || 'Doctor'}</span>
                  <span>• {user.email || 'doctor@saidental.com'}</span>
                  <span>• {user.phone || 'Sai Dental Clinic'}</span>
                </div>
              </div>
            </div>
            <button type="button" className="btn btn-secondary" onClick={fetchDoctorData} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={15} /> Refresh Dashboard
            </button>
          </div>
        </div>

        {/* Doctor Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} color="#0284c7" /> Total Assigned Patients
            </span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '6px' }}>
              {docLoading ? '…' : safePatients.length}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Assigned patient roster</span>
          </div>

          <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #7c3aed' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#7c3aed" /> Today's Appointments
            </span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#7c3aed', display: 'block', marginTop: '6px' }}>
              {docLoading ? '…' : todayAppts.length}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Scheduled for today</span>
          </div>

          <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #d97706' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="#d97706" /> Waiting Patients
            </span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#d97706', display: 'block', marginTop: '6px' }}>
              {docLoading ? '…' : waitingQueue.length}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>In queue for consultation</span>
          </div>

          <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #059669' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={15} color="#059669" /> Completed Today
            </span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#059669', display: 'block', marginTop: '6px' }}>
              {docLoading ? '…' : completedToday.length}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Sessions completed today</span>
          </div>

          <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #475569' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#475569" /> Upcoming Appointments
            </span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#334155', display: 'block', marginTop: '6px' }}>
              {docLoading ? '…' : upcomingAppts.length}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Future scheduled visits</span>
          </div>
        </div>

        {/* Doctor Grid: My Patients & Today's Appointments */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* Today's Appointments & Waiting Roster */}
          <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} /> Today's Appointments & Queue
              </h2>
              <Link to="/portal/check-in" style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '2px' }}>
                Open Roster <ChevronRight size={14} />
              </Link>
            </div>

            {todayAppts.length === 0 && waitingQueue.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#f8fafc', borderRadius: '8px' }}>
                No appointments or waiting patients scheduled for today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todayAppts.slice(0, 5).map((a) => (
                  <div key={a._id || a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                        {a.patientName || (a.patient ? `${a.patient.firstName || ''} ${a.patient.lastName || ''}`.trim() : 'Patient')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {a.time || '10:00 AM'} • {a.reason || 'Consultation'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                      onClick={() => handleOpenConsultation(a.patient?._id || a.patient?.id || a.patient)}
                    >
                      <Play size={12} /> Start
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Assigned Patients */}
          <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} /> My Patients
              </h2>
              <Link to="/portal/patients" style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '2px' }}>
                View All My Patients <ChevronRight size={14} />
              </Link>
            </div>

            {safePatients.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#f8fafc', borderRadius: '8px' }}>
                No patients currently assigned to you.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {safePatients.slice(0, 5).map((p) => (
                  <div key={p._id || p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                        {p.firstName} {p.lastName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        ID: {p.patientId} • Phone: {p.phone || '—'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleOpenConsultation(p._id || p.id)}
                    >
                      <Stethoscope size={13} /> Open EMR
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── 2. RECEPTIONIST DASHBOARD VIEW ──
  if (isReceptionist) {
    const safePatients = ensureArray(recPatients)
    const safeAppts = ensureArray(recAppts)
    const safeQueue = ensureArray(recQueue)

    const currentMonthPrefix = new Date().toISOString().slice(0, 7)
    const newPatientsThisMonth = safePatients.filter((p) => (p.createdAt || '').startsWith(currentMonthPrefix)).length
    const todayAppts = safeAppts.filter((a) => (a.date || '').startsWith(todayStr))
    const waitingQueue = safeQueue.filter((v) => v.status === 'registered' || v.status === 'in-progress')
    const upcomingAppts = safeAppts.filter((a) => (a.date || '') > todayStr)

    return (
      <div className="portal-page">
        {/* Welcome Header */}
        <div className="portal-heading" style={{ marginBottom: '20px' }}>
          <h1>Receptionist Dashboard</h1>
          <p>Quick access for patient registration, appointment scheduling, and front-desk check-in queue management.</p>
        </div>

        {/* Quick Receptionist Action Buttons */}
        <div className="card mb-6" style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
          <h2 className="card-title" style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)' }}>
            Quick Receptionist Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <Link to="/portal/patients" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', height: 'auto', fontWeight: 600 }}>
              <UserPlus size={18} color="#0284c7" /> Register New Patient
            </Link>
            <Link to="/portal/appointments" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', height: 'auto', fontWeight: 600 }}>
              <CalendarPlus size={18} color="#7c3aed" /> Book Appointment
            </Link>
            <Link to="/portal/appointments" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', height: 'auto', fontWeight: 600 }}>
              <Users size={18} color="#d97706" /> Assign Patient to Doctor
            </Link>
            <Link to="/portal/check-in" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', height: 'auto', fontWeight: 600 }}>
              <UserCheck size={18} color="#059669" /> Check-In Queue & Token
            </Link>
          </div>
        </div>

        {/* Receptionist Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} color="#0284c7" /> Total Registered Patients
            </span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '6px' }}>
              {recLoading ? '…' : safePatients.length}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Total patient database</span>
          </div>

          <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #059669' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserPlus size={15} color="#059669" /> New Patients This Month
            </span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#059669', display: 'block', marginTop: '6px' }}>
              {recLoading ? '…' : newPatientsThisMonth}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Registered this month</span>
          </div>

          <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #7c3aed' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#7c3aed" /> Today's Appointments
            </span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#7c3aed', display: 'block', marginTop: '6px' }}>
              {recLoading ? '…' : todayAppts.length}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Appointments today</span>
          </div>

          <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #d97706' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} color="#d97706" /> Waiting Queue
            </span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#d97706', display: 'block', marginTop: '6px' }}>
              {recLoading ? '…' : waitingQueue.length}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Patients waiting today</span>
          </div>

          <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #475569' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} color="#475569" /> Upcoming Appointments
            </span>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#334155', display: 'block', marginTop: '6px' }}>
              {recLoading ? '…' : upcomingAppts.length}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Future appointments</span>
          </div>
        </div>

        {/* Receptionist Tables Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* Today's Queue Overview */}
          <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)' }}>
                Today's Queue Roster
              </h2>
              <Link to="/portal/check-in" style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7' }}>
                Manage Queue →
              </Link>
            </div>
            {safeQueue.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#f8fafc', borderRadius: '8px' }}>
                No patients checked in today.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {safeQueue.slice(0, 5).map((v) => (
                  <div key={v._id || v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                    <div>
                      <strong>Token #{v.token || '—'}</strong> — {v.patient ? `${v.patient.firstName || ''} ${v.patient.lastName || ''}`.trim() : 'Patient'}
                    </div>
                    <span className="badge badge-info">{v.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Registrations */}
          <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)' }}>
                Recent Patient Directory
              </h2>
              <Link to="/portal/patients" style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7' }}>
                View Directory →
              </Link>
            </div>
            {safePatients.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px', background: '#f8fafc', borderRadius: '8px' }}>
                No patients registered yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {safePatients.slice(0, 5).map((p) => (
                  <div key={p._id || p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', fontSize: '13px' }}>
                    <div>
                      <strong>{p.patientId}</strong>: {p.firstName} {p.lastName} ({p.phone || 'No phone'})
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{p.city || 'Chennai'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── 3. ADMIN DASHBOARD VIEW (FULL ANALYTICS) ──
  const s = data?.summary || {}
  const series = data?.series || {}
  const salesLabels = (series.salesTrend || []).map((r) => r.label)
  const purchaseLabels = (series.purchaseTrend || []).map((r) => r.label)

  const summaryCards = [
    { label: 'Revenue', value: formatCurrency(s.revenue), icon: <IndianRupee size={18} />, tint: 'rgba(26,60,43,0.08)', color: 'var(--color-forest)' },
    { label: 'Orders', value: formatNumber(s.orders), icon: <CreditCard size={18} />, tint: 'rgba(26,60,43,0.08)', color: 'var(--color-forest)' },
    { label: 'Gross Profit', value: formatCurrency(s.profit), icon: <TrendingUp size={18} />, tint: 'rgba(244,211,94,0.2)', color: '#d98200' },
    { label: 'Avg Order', value: formatCurrency(s.avgOrderValue), icon: <BarChart2 size={18} />, tint: 'rgba(26,60,43,0.08)', color: 'var(--color-forest)' },
    { label: 'Patients', value: formatNumber(s.totalPatients), icon: <Users size={18} />, tint: 'rgba(26,60,43,0.08)', color: 'var(--color-forest)' },
    { label: 'Consultations', value: formatNumber(s.consultations), icon: <Activity size={18} />, tint: 'rgba(255,140,105,0.15)', color: '#d95f43' },
    { label: 'Inventory Value', value: formatCurrency(s.inventoryValue), icon: <Package size={18} />, tint: 'rgba(244,211,94,0.2)', color: '#d98200' },
    { label: 'Low Stock', value: formatNumber(s.lowStockCount), icon: <AlertTriangle size={18} />, tint: 'rgba(217,67,67,0.1)', color: '#d94343' },
  ]

  return (
    <div className="portal-page">
      <div className="portal-heading mb-6">
        <h1>Welcome back, {user.name}</h1>
        <p>You are signed in as <strong>{user.roleLabel || user.role}</strong>. Clinic Operations & Analytics Dashboard.</p>
      </div>

      <div className="card mb-6" style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="card-title" style={{ margin: 0, fontSize: '16px' }}>Clinic Analytics</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Revenue, profit and operations for the selected period
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="period-toggle" style={{ display: 'flex', background: 'var(--color-paper-soft)', borderRadius: '2px', padding: '3px' }}>
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`btn btn-sm ${period === p.value ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ minWidth: '44px' }}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-sm btn-outline" onClick={fetchAnalytics} aria-label="Refresh analytics">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4" role="alert">{error}</div>}

      <div className="stat-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {summaryCards.map((c) => (
          <div className="stat-card" key={c.label} style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.tint, color: c.color, flexShrink: 0 }}>
                {c.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <span className="stat-label" style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{c.label}</span>
                <span className="stat-value" style={{ fontSize: '22px', fontWeight: '800', color: c.color, lineHeight: 1.2 }}>
                  {analyticsLoading ? '…' : c.value}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <LineChartCard
          title="Sales Trend"
          subtitle="Revenue collected over time"
          labels={salesLabels}
          series={[{ name: 'Revenue', data: (series.salesTrend || []).map((r) => r.revenue), color: 'var(--color-forest)' }]}
          loading={analyticsLoading}
          error={error}
          onRetry={fetchAnalytics}
          yLabel="Revenue"
        />
        <LineChartCard
          title="Profit Trend"
          subtitle="Revenue minus dispensed COGS"
          labels={(series.profitTrend || []).map((r) => r.label)}
          series={[
            { name: 'Revenue', data: (series.profitTrend || []).map((r) => r.revenue), color: 'var(--color-forest)' },
            { name: 'Cost', data: (series.profitTrend || []).map((r) => r.cost), color: '#d98200' },
            { name: 'Profit', data: (series.profitTrend || []).map((r) => r.profit), color: 'var(--color-coral)' },
          ]}
          loading={analyticsLoading}
          error={error}
          onRetry={fetchAnalytics}
          yLabel="Amount"
        />
      </div>
    </div>
  )
}
