import { useState, useEffect } from 'react'
import { Calendar, TrendingUp, Users, DollarSign, RefreshCw, Clock, CreditCard, Pill, AlertTriangle, PackageCheck, BarChart3, Stethoscope, UserPlus, Search, UserCheck, CheckCircle2 } from 'lucide-react'
import useAuth from '../../hooks/useAuth'
import { getReceptionistSummary, getPharmacySummary, getAnalyticsSeries, getInventoryReport, getProfitReport } from '../../services/reportsService'
import { getExecutiveAnalytics } from '../../services/settingsService'
import { listUsers } from '../../services/userService'
import { listPatients } from '../../services/patientService'
import { listAppointments } from '../../services/appointmentService'
import { publicService } from '../../services/publicService'
import { LineChartCard, BarChartCard, PieChartCard } from '../../components/reports/charts'
import { ReportsSkeleton } from '../../components/common/skeleton'
import { formatNumber, formatCurrency } from '../../utils/chartTheme'

export default function ReportsPage() {
  const { user } = useAuth()
  const isReceptionist = user?.role === 'receptionist'
  const isDoctor = user?.role === 'doctor'
  const docId = user?._id || user?.id || ''

  // Receptionist-specific tabs: 'patient-reports' | 'doctor-reports'
  const [recTab, setRecTab] = useState('patient-reports')

  // General tabs for non-receptionist: 'receptionist' | 'pharmacy' | 'analytics'
  const [activeTab, setActiveTab] = useState('receptionist')

  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [doctorIdFilter, setDoctorIdFilter] = useState(isDoctor ? docId : '')

  // Report data states
  const [doctorsList, setDoctorsList] = useState([])
  const [patientsList, setPatientsList] = useState([])
  const [appointmentsList, setAppointmentsList] = useState([])
  const [summary, setSummary] = useState(null)
  const [pharmacyReport, setPharmacyReport] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [inventoryData, setInventoryData] = useState(null)
  const [profitData, setProfitData] = useState(null)
  const [studioTrend, setStudioTrend] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Receptionist filters
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState(isDoctor ? docId : 'all')

  const ensureArray = (val) => {
    if (!val) return []
    if (Array.isArray(val)) return val
    if (typeof val === 'object') {
      if (Array.isArray(val.items)) return val.items
      if (Array.isArray(val.appointments)) return val.appointments
      if (Array.isArray(val.patients)) return val.patients
      if (Array.isArray(val.doctors)) return val.doctors
      if (Array.isArray(val.users)) return val.users
      if (Array.isArray(val.data?.items)) return val.data.items
      if (Array.isArray(val.data?.appointments)) return val.data.appointments
      if (Array.isArray(val.data?.patients)) return val.data.patients
      if (Array.isArray(val.data?.doctors)) return val.data.doctors
      if (Array.isArray(val.data)) return val.data
    }
    return []
  }

  // Initial load for doctors
  useEffect(() => {
    publicService.getDoctors()
      .then((docs) => setDoctorsList(ensureArray(docs)))
      .catch(() => {
        listUsers({ role: 'doctor' })
          .then((res) => setDoctorsList(ensureArray(res)))
          .catch(() => {})
      })
  }, [])

  const fetchSummary = async () => {
    setLoading(true)
    setError('')
    try {
      if (isReceptionist) {
        // Fetch patient directory + appointments for Receptionist reports
        const [patRes, aptRes] = await Promise.all([
          listPatients({ limit: 100 }),
          listAppointments({ date: reportDate }),
        ])
        setPatientsList(ensureArray(patRes))
        setAppointmentsList(ensureArray(aptRes))
      } else {
        if (activeTab === 'receptionist') {
          const res = await getReceptionistSummary({ date: reportDate })
          setSummary(res.summary)
        } else if (activeTab === 'pharmacy') {
          const [pharm, inv] = await Promise.all([
            getPharmacySummary({ date: reportDate }),
            getInventoryReport(),
          ])
          setPharmacyReport(pharm.summary)
          setInventoryData(inv.data)
        } else if (activeTab === 'analytics') {
          const [exec, trend, profit] = await Promise.all([
            getExecutiveAnalytics({ startDate, endDate, doctorId: doctorIdFilter }),
            getAnalyticsSeries({ startDate, endDate }),
            getProfitReport({ startDate, endDate }),
          ])
          setAnalyticsData(exec.analytics)
          setStudioTrend(trend.data)
          setProfitData(profit.data)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load report summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [reportDate, activeTab, recTab, startDate, endDate, doctorIdFilter, isReceptionist])

  // ── RECEPTIONIST VIEW ──
  if (isReceptionist) {
    const safePatients = ensureArray(patientsList)
    const safeAppointments = ensureArray(appointmentsList)
    const safeDoctors = ensureArray(doctorsList)

    const totalPatients = safePatients.length
    const currentMonthPrefix = new Date().toISOString().slice(0, 7)
    const newPatientsThisMonth = safePatients.filter((p) => (p.createdAt || '').startsWith(currentMonthPrefix)).length
    const activePatientsCount = safePatients.filter((p) => !p.isArchived).length

    const filteredPatients = safePatients.filter((p) => {
      if (!patientSearch.trim()) return true
      const q = patientSearch.toLowerCase()
      return (
        (p.firstName && p.firstName.toLowerCase().includes(q)) ||
        (p.lastName && p.lastName.toLowerCase().includes(q)) ||
        (p.patientId && p.patientId.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q))
      )
    })

    const totalDoctors = safeDoctors.length
    const totalTodayApts = safeAppointments.length

    return (
      <div className="portal-page">
        <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Receptionist Operational Reports</h1>
            <p>View comprehensive patient directory details, registration status, and doctor assignment rosters.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              className="form-control"
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
            <button type="button" className="btn btn-secondary" onClick={fetchSummary}>
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* 2 Single Tabs for Receptionist */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <button
            type="button"
            className={`btn ${recTab === 'patient-reports' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setRecTab('patient-reports')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Users size={16} /> Patient Reports
          </button>
          <button
            type="button"
            className={`btn ${recTab === 'doctor-reports' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setRecTab('doctor-reports')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Stethoscope size={16} /> Doctor Reports
          </button>
        </div>

        {error && <div className="alert alert-danger mb-4" role="alert">{error}</div>}

        {loading ? (
          <ReportsSkeleton />
        ) : recTab === 'patient-reports' ? (
          <div>
            {/* Patient Overview Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} color="#0284c7" /> Total Registered Patients
                </span>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '6px' }}>
                  {totalPatients}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Complete patient database count</span>
              </div>

              <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #059669' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserPlus size={16} color="#059669" /> New Registrations (This Month)
                </span>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#059669', display: 'block', marginTop: '6px' }}>
                  {newPatientsThisMonth}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Registered in current calendar month</span>
              </div>

              <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #7c3aed' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserCheck size={16} color="#7c3aed" /> Active Clinical Profiles
                </span>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#7c3aed', display: 'block', marginTop: '6px' }}>
                  {activePatientsCount}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Active patient profiles available</span>
              </div>
            </div>

            {/* Patient Directory Table */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <h2 className="card-title" style={{ margin: 0, fontSize: '16px' }}>
                  Patient Information Directory ({filteredPatients.length})
                </h2>
                <div style={{ position: 'relative', width: '280px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by name, ID, phone, city..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
                </div>
              </div>

              {filteredPatients.length === 0 ? (
                <p className="text-muted text-center py-6">No patient records match the search query.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>Patient ID</th>
                        <th style={{ padding: '10px' }}>Full Name</th>
                        <th style={{ padding: '10px' }}>Age / Sex</th>
                        <th style={{ padding: '10px' }}>Phone</th>
                        <th style={{ padding: '10px' }}>City</th>
                        <th style={{ padding: '10px' }}>Registration Date</th>
                        <th style={{ padding: '10px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((p) => (
                        <tr key={p._id || p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px', fontWeight: 600 }}>
                            <span className="badge badge-subtle">{p.patientId}</span>
                          </td>
                          <td style={{ padding: '10px', fontWeight: 500 }}>
                            {p.title ? `${p.title}. ` : ''}{p.firstName} {p.lastName}
                          </td>
                          <td style={{ padding: '10px', textTransform: 'capitalize' }}>
                            {p.gender || '—'} {p.age ? `(${p.age} yrs)` : ''}
                          </td>
                          <td style={{ padding: '10px' }}>{p.phone || '—'}</td>
                          <td style={{ padding: '10px' }}>{p.city || '—'}</td>
                          <td style={{ padding: '10px', fontSize: '12px', color: '#64748b' }}>
                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span className={`badge ${p.isArchived ? 'badge-warning' : 'badge-success'}`}>
                              {p.isArchived ? 'Archived' : 'Active'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Doctor Reports Tab */
          <div>
            {/* Doctor Overview Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #059669' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Stethoscope size={16} color="#059669" /> Total Active Doctors
                </span>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '6px' }}>
                  {totalDoctors}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Doctors available for patient assignment</span>
              </div>

              <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderLeft: '4px solid #7c3aed' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} color="#7c3aed" /> Today's Assigned Appointments
                </span>
                <span style={{ fontSize: '32px', fontWeight: 800, color: '#7c3aed', display: 'block', marginTop: '6px' }}>
                  {totalTodayApts}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Total appointments assigned for {reportDate}</span>
              </div>
            </div>

            {/* Doctor Filter Bar */}
            {!isDoctor && (
              <div className="card mb-6" style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Filter Doctor:</label>
                  <select
                    className="form-control"
                    style={{ width: '220px', padding: '6px 12px', fontSize: '13px' }}
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                  >
                    <option value="all">All Doctors ({safeDoctors.length})</option>
                    {safeDoctors.map((d) => (
                      <option key={d._id || d.id} value={d._id || d.id}>
                        Dr. {d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Doctor-wise Assignment Breakdown Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {safeDoctors
                .filter((doc) => selectedDoctorId === 'all' || String(doc._id || doc.id) === selectedDoctorId)
                .map((doc) => {
                  const docIdStr = String(doc._id || doc.id)
                  const assignedApts = safeAppointments.filter(
                    (a) => String(a.doctor?._id || a.doctor?.id || a.doctor) === docIdStr,
                  )
                  const docName = doc.name || `Dr. ${doc.firstName || ''} ${doc.lastName || ''}`.trim()

                  return (
                    <div className="card" key={docIdStr} style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-forest)' }}>
                            {docName}
                          </h3>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {doc.specialization || 'General Dental Practitioner'} • {doc.phone || 'No phone'}
                          </span>
                        </div>
                        <span className="badge badge-info" style={{ fontSize: '12px' }}>
                          {assignedApts.length} Patient(s) Assigned Today
                        </span>
                      </div>

                      {assignedApts.length === 0 ? (
                        <p className="text-muted" style={{ fontSize: '13px', margin: 0 }}>
                          No patient appointments assigned to {docName} for this date.
                        </p>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                                <th style={{ padding: '8px' }}>Appt / Token</th>
                                <th style={{ padding: '8px' }}>Patient Name</th>
                                <th style={{ padding: '8px' }}>Phone</th>
                                <th style={{ padding: '8px' }}>Time Slot</th>
                                <th style={{ padding: '8px' }}>Reason / Type</th>
                                <th style={{ padding: '8px' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignedApts.map((apt) => (
                                <tr key={apt._id || apt.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '8px', fontWeight: 600 }}>
                                    {apt.tokenNumber ? `Token #${apt.tokenNumber}` : apt.appointmentId || 'Appt'}
                                  </td>
                                  <td style={{ padding: '8px', fontWeight: 500 }}>
                                    {apt.patientName || (apt.patient ? `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}` : '—')}
                                  </td>
                                  <td style={{ padding: '8px' }}>
                                    {apt.patientPhone || apt.patient?.phone || '—'}
                                  </td>
                                  <td style={{ padding: '8px' }}>
                                    {apt.slotTime || apt.time || 'Walk-in'}
                                  </td>
                                  <td style={{ padding: '8px' }}>
                                    {apt.reason || apt.type || 'Consultation'}
                                  </td>
                                  <td style={{ padding: '8px' }}>
                                    <span className={`badge ${apt.status === 'completed' ? 'badge-success' : apt.status === 'cancelled' ? 'badge-danger' : 'badge-info'}`}>
                                      {apt.status || 'scheduled'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── ADMIN / DOCTOR / PHARMACY FULL REPORTS VIEW ──
  const footfall = summary?.footfall || { total: 0, walkIn: 0, appointmentCheckIn: 0, byStatus: {} }
  const revenue = summary?.revenue || { totalRupees: 0, byMethod: {}, paymentCount: 0 }
  const apts = summary?.appointments || { byStatus: {}, bySource: {} }

  const pDispensing = pharmacyReport?.dispensing || { totalEvents: 0, totalUnits: 0, records: [] }
  const pInventory = pharmacyReport?.inventorySummary || { totalMedicines: 0, totalBatches: 0, totalStockQuantity: 0, totalCostValue: 0, totalRetailValue: 0 }
  const pLowStock = pharmacyReport?.lowStock || { count: 0, items: [] }
  const pExpiring = pharmacyReport?.expiringBatches || { count: 0, items: [] }

  const execRev = analyticsData?.revenue || { totalRupees: 0, byMethodRupees: {}, paymentCount: 0 }
  const execConsult = analyticsData?.consultations || { total: 0, completed: 0, inProgress: 0 }

  return (
    <div className="portal-page">
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Clinic Performance & Operational Reports</h1>
          <p>Daily footfall, revenue summary, pharmacy inventory reports, and executive analytics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab !== 'analytics' ? (
            <input
              type="date"
              className="form-control"
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="date"
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '13px' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>to</span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '13px' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}
          <button type="button" className="btn btn-secondary" onClick={fetchSummary}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Full Report Tabs for Admin / Doctor / Pharmacy */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'receptionist' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('receptionist')}
        >
          <Users size={16} className="mr-1 inline" /> Receptionist & Revenue Summary
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'pharmacy' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('pharmacy')}
        >
          <Pill size={16} className="mr-1 inline" /> Pharmacy & Inventory Reports
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={16} className="mr-1 inline" /> Cross-Module Executive Analytics
        </button>
      </div>

      {error && <div className="alert alert-danger mb-4" role="alert">{error}</div>}

      {loading && !summary && !pharmacyReport && !analyticsData ? (
        <ReportsSkeleton />
      ) : activeTab === 'receptionist' ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Today's Footfall</span>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '6px' }}>{footfall.total}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{footfall.walkIn} Walk-ins • {footfall.appointmentCheckIn} Appointments</span>
            </div>
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #059669' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Total Collections</span>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#059669', display: 'block', marginTop: '6px' }}>₹{revenue.totalRupees ? revenue.totalRupees.toLocaleString('en-IN') : '0'}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Across {revenue.paymentCount} payments</span>
            </div>
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #7c3aed' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Appointments</span>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#7c3aed', display: 'block', marginTop: '6px' }}>{apts.byStatus?.total || 0}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>{apts.byStatus?.completed || 0} Completed</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'pharmacy' ? (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Medicines In Stock</span>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '6px' }}>{pInventory.totalMedicines}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Across {pInventory.totalBatches} active batches</span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #059669' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Total Collections</span>
              <span style={{ fontSize: '32px', fontWeight: 800, color: '#059669', display: 'block', marginTop: '6px' }}>₹{execRev.totalRupees ? execRev.totalRupees.toLocaleString('en-IN') : '0'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}