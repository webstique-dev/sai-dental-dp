import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, Clock, Plus, Search, UserCheck, Play, Eye, RefreshCw, CheckCircle } from 'lucide-react'
import { SectionCard } from '../../components/ui/fields'
import { listPatients, createPatient } from '../../services/patientService'
import { createConsultation, patientConsultations } from '../../services/consultationService'
import { listAppointments } from '../../services/appointmentService'
import { getQueueList, updateQueueStatus } from '../../services/checkInService'
import { publicService } from '../../services/publicService'
import useAuth from '../../hooks/useAuth'

const STATUS_LABELS = {
  draft: 'Draft',
  'in-progress': 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function ConsultationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isDoctor = user?.role === 'doctor'

  // Doctor Queue / Waiting List State
  const [queueVisits, setQueueVisits] = useState([])
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [selectedDoctorId, setSelectedDoctorId] = useState(user?._id || user?.id || '')
  const [queueDate, setQueueDate] = useState(new Date().toISOString().split('T')[0])
  const [queueLoading, setQueueLoading] = useState(false)

  // Patient Search & History State
  const [search, setSearch] = useState('')
  const [searching, setSearching] = useState(false)
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [showNewPatient, setShowNewPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: 'female',
  })

  // Load doctors list
  useEffect(() => {
    publicService.getDoctors()
      .then((docs) => {
        const list = Array.isArray(docs) ? docs : docs?.doctors || []
        setDoctors(list)
        if (!selectedDoctorId && list.length > 0) {
          setSelectedDoctorId(list[0]._id || list[0].id || '')
        }
      })
      .catch(() => {})
  }, [])

  // Fetch Doctor Waiting Queue
  const fetchDoctorQueue = async () => {
    setQueueLoading(true)
    try {
      const targetDoc = isDoctor ? (user?._id || user?.id || selectedDoctorId) : selectedDoctorId
      const [qRes, aptRes] = await Promise.all([
        getQueueList({ date: queueDate, doctorId: targetDoc }),
        listAppointments({ date: queueDate, doctor: targetDoc }),
      ])

      setQueueVisits(qRes.visits || [])
      setAppointments(aptRes.items || aptRes.appointments || [])
    } catch (err) {
      console.error('Failed to load doctor queue:', err)
    } finally {
      setQueueLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctorQueue()
  }, [queueDate, selectedDoctorId, isDoctor, user])

  const runSearch = async (e) => {
    e?.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    setError('')
    try {
      const res = await listPatients({ search: search.trim(), limit: 20 })
      setPatients(res.items || res.patients || [])
    } catch (err) {
      setError(err.message || 'Unable to search patients')
    } finally {
      setSearching(false)
    }
  }

  const selectPatient = async (patient) => {
    setSelectedPatient(patient)
    setHistoryLoading(true)
    setError('')
    try {
      const res = await patientConsultations(patient._id || patient.id)
      setHistory(res.items || res.consultations || [])
    } catch (err) {
      setError(err.message || 'Unable to load consultations')
    } finally {
      setHistoryLoading(false)
    }
  }

  const startConsultationForPatient = async (patientId, appointmentId = null) => {
    if (!patientId) return
    setNotice('')
    setError('')
    try {
      const res = await createConsultation({
        patientId,
        appointmentId,
      })
      setNotice('Consultation session created.')
      navigate(`/portal/consultations/${res.consultation.id || res.consultation._id}`)
    } catch (err) {
      setError(err.message || 'Unable to start consultation')
    }
  }

  const registerPatient = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await createPatient(newPatient)
      setNotice('Patient registered successfully.')
      setShowNewPatient(false)
      setNewPatient({ firstName: '', lastName: '', phone: '', gender: 'female' })
      const patient = res.patient
      setSelectedPatient(patient)
      const historyRes = await patientConsultations(patient._id)
      setHistory(historyRes.items || [])
    } catch (err) {
      setError(err.message || 'Unable to register patient')
    }
  }

  // Combine queue visits & appointments into a unified waiting roster
  const activeQueueItems = [
    ...queueVisits.map((v) => ({
      id: v._id || v.id,
      patientId: v.patient?._id || v.patient?.id || v.patient,
      patientName: v.patient ? `${v.patient.firstName || ''} ${v.patient.lastName || ''}`.trim() : 'Patient',
      patientCode: v.patient?.patientId || '—',
      phone: v.patient?.phone || '—',
      doctorName: v.doctor?.name || 'Doctor',
      token: v.token ? `Token #${v.token}` : 'Walk-in',
      timeSlot: v.opDate ? new Date(v.opDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
      status: v.status, // 'registered', 'in-progress', 'completed'
      source: 'Check-in Queue',
      type: 'queue',
    })),
    ...appointments.map((a) => ({
      id: a._id || a.id,
      patientId: a.patient?._id || a.patient?.id || a.patient,
      patientName: a.patientName || (a.patient ? `${a.patient.firstName || ''} ${a.patient.lastName || ''}`.trim() : 'Patient'),
      patientCode: a.patient?.patientId || '—',
      phone: a.patientPhone || a.patient?.phone || '—',
      doctorName: a.doctor?.name || 'Doctor',
      token: a.appointmentId || 'Appt',
      timeSlot: a.slotTime || a.time || 'Scheduled',
      status: a.status, // 'scheduled', 'checked-in', 'in-consultation', 'completed'
      source: 'Booked Appointment',
      type: 'appointment',
      reason: a.reason,
    })),
  ]

  const waitingRoster = activeQueueItems.filter((i) => i.status !== 'completed' && i.status !== 'cancelled')
  const completedRoster = activeQueueItems.filter((i) => i.status === 'completed')

  return (
    <div className="portal-page">
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Stethoscope className="text-primary" size={26} /> Doctor's Clinical Hub & Waiting Queue
          </h1>
          <p>Attend assigned patients, start dental consultations, and access EMR patient records.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="date"
            className="form-control"
            style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            value={queueDate}
            onChange={(e) => setQueueDate(e.target.value)}
          />
          {!isDoctor && (
            <select
              className="form-control"
              style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
            >
              <option value="">All Doctors</option>
              {doctors.map((d) => (
                <option key={d._id || d.id} value={d._id || d.id}>
                  Dr. {d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim()}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn btn-secondary" onClick={fetchDoctorQueue}>
            <RefreshCw size={15} /> Refresh Queue
          </button>
        </div>
      </div>

      {notice && <div className="alert alert-success mb-4">{notice}</div>}
      {error && <div className="alert alert-danger mb-4">{error}</div>}

      {/* ── DOCTOR WAITING LIST & QUEUE ── */}
      <div className="card mb-6" style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <h2 className="card-title" style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-forest)' }}>
            <Clock size={20} /> Assigned Patient Waiting Roster ({waitingRoster.length})
          </h2>
          <span className="badge badge-info">{queueDate}</span>
        </div>

        {queueLoading ? (
          <div className="text-center py-6 text-muted">Loading assigned patients...</div>
        ) : waitingRoster.length === 0 ? (
          <div className="text-center py-8 text-muted" style={{ background: '#f8fafc', borderRadius: '8px' }}>
            No patients waiting in queue for Dr. {user?.firstName || 'Doctor'} on {queueDate}.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {waitingRoster.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  background: item.status === 'in-progress' || item.status === 'in-consultation' ? '#f5f3ff' : '#fff',
                  borderColor: item.status === 'in-progress' || item.status === 'in-consultation' ? '#c4b5fd' : '#e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                    {item.token}
                  </span>
                  <span className="badge badge-subtle">{item.timeSlot}</span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a', marginBottom: '2px' }}>
                  {item.patientName}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                  ID: {item.patientCode} • Phone: {item.phone}
                </div>

                {item.reason && (
                  <div style={{ fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', marginBottom: '12px' }}>
                    Reason: <strong>{item.reason}</strong>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                    onClick={() => startConsultationForPatient(item.patientId, item.type === 'appointment' ? item.id : null)}
                  >
                    <Play size={14} /> Start Consultation
                  </button>
                  {item.patientId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                      onClick={() => selectPatient({ _id: item.patientId, firstName: item.patientName, lastName: '', phone: item.phone })}
                    >
                      <Eye size={15} /> History
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FIND PATIENT & PATIENT HISTORY ── */}
      <SectionCard title="Patient Lookup & Clinical History">
        <form className="search-row" onSubmit={runSearch} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <input
            className="form-control"
            type="search"
            style={{ flex: 1, padding: '9px 14px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            value={search}
            placeholder="Search patient by name, PAT-ID or phone number..."
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
          {!isDoctor && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowNewPatient(!showNewPatient)}
            >
              <Plus size={16} /> New Patient
            </button>
          )}
        </form>

        {showNewPatient && !isDoctor && (
          <form className="card mb-6" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }} onSubmit={registerPatient}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700 }}>Quick Register Patient</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              <input
                className="form-control"
                placeholder="First Name *"
                required
                value={newPatient.firstName}
                onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
              />
              <input
                className="form-control"
                placeholder="Last Name"
                value={newPatient.lastName}
                onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
              />
              <input
                className="form-control"
                placeholder="Phone Number"
                value={newPatient.phone}
                onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
              />
              <select
                className="form-control"
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">Save & Select Patient</button>
          </form>
        )}

        {patients.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {patients.map((p) => (
              <div
                key={p._id || p.id}
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: selectedPatient?._id === p._id ? '#e0f2fe' : '#fff',
                  cursor: 'pointer',
                }}
                onClick={() => selectPatient(p)}
              >
                <div>
                  <strong style={{ fontSize: '14px' }}>{p.firstName} {p.lastName}</strong>
                  <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '10px' }}>({p.patientId}) • Phone: {p.phone || '—'}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    startConsultationForPatient(p._id || p.id)
                  }}
                >
                  Start Consultation
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedPatient && (
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                EMR History — {selectedPatient.firstName} {selectedPatient.lastName} ({selectedPatient.patientId})
              </h3>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => startConsultationForPatient(selectedPatient._id || selectedPatient.id)}
              >
                + New Consultation Session
              </button>
            </div>

            {historyLoading ? (
              <p className="text-muted py-4">Loading consultation history...</p>
            ) : history.length === 0 ? (
              <p className="text-muted py-4">No previous consultations recorded for this patient.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.map((c) => (
                  <div
                    key={c._id || c.id}
                    style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>
                        Session #{c.consultationNumber || c.id}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : 'Date'} • Status: <span className="badge badge-subtle">{STATUS_LABELS[c.status] || c.status}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/portal/consultations/${c._id || c.id}`)}
                    >
                      Open Consultation
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  )
}