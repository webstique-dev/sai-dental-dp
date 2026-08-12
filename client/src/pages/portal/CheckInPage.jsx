import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCheck, Clock, User, CheckCircle, Play, Printer, Plus, RefreshCw, Search, Sparkles, CheckCircle2, AlertCircle, Stethoscope } from 'lucide-react'
import { getQueueList, checkInWalkIn, updateQueueStatus } from '../../services/checkInService'
import { listPatients } from '../../services/patientService'
import { createConsultation } from '../../services/consultationService'
import { publicService } from '../../services/publicService'
import { SkeletonList } from '../../components/common/skeleton'
import { Modal } from '../../components/common/modal'
import ConfirmationDialog from '../../components/common/ConfirmationDialog'
import { useNotification } from '../../components/common/notification'
import useAuth from '../../hooks/useAuth'

export default function CheckInPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const notify = useNotification()

  // Main data states
  const [visits, setVisits] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isDoctor = user?.role === 'doctor'
  const doctorIdVal = user?._id || user?.id || ''

  // Queue filters
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [filterDoctor, setFilterDoctor] = useState(isDoctor ? doctorIdVal : '')
  const [searchQueue, setSearchQueue] = useState('')

  useEffect(() => {
    if (isDoctor && doctorIdVal) {
      setFilterDoctor(doctorIdVal)
      setWalkInForm((prev) => ({ ...prev, doctorId: doctorIdVal }))
    }
  }, [isDoctor, doctorIdVal])

  // Walk-in modal states
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [matchingPatients, setMatchingPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [walkInForm, setWalkInForm] = useState({
    doctorId: '',
    reason: '',
    type: 'Walk-in',
  })
  const [walkInSubmitting, setWalkInSubmitting] = useState(false)

  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Printable Token ticket state
  const [tokenTicket, setTokenTicket] = useState(null)

  const fetchQueue = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getQueueList({ date: filterDate, doctorId: filterDoctor })
      setVisits(data.visits || [])
    } catch (err) {
      const errMsg = err.message || 'Failed to load queue list'
      setError(errMsg)
      notify.error(errMsg)
    } finally {
      setLoading(false)
    }
  }

  const fetchDoctors = async () => {
    try {
      const res = await publicService.getDoctors()
      const docs = Array.isArray(res) ? res : (res?.doctors || [])
      setDoctors(docs)
      if (docs.length > 0) {
        setWalkInForm((prev) => ({ ...prev, doctorId: prev.doctorId || docs[0]._id || docs[0].id || '' }))
      }
    } catch (err) {
      console.error('Failed to load doctors in CheckInPage:', err)
      notify.error(err.message || 'Failed to load doctor list')
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [filterDate, filterDoctor])

  useEffect(() => {
    fetchDoctors()
  }, [])

  // Auto-suggest patient search in modal
  useEffect(() => {
    if (!patientSearch.trim()) {
      setMatchingPatients([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await listPatients({ search: patientSearch.trim(), limit: 5 })
        setMatchingPatients(res.items || res.patients || [])
      } catch (err) {
        console.error(err)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch])

  const openWalkInModal = () => {
    setSelectedPatient(null)
    setPatientSearch('')
    setMatchingPatients([])
    setWalkInForm({
      doctorId: doctors[0]?._id || doctors[0]?.id || '',
      reason: '',
      type: 'Walk-in',
    })
    setShowWalkInModal(true)
  }

  // Trigger confirmation dialog on check-in submit
  const handleWalkInSubmit = (e) => {
    if (e) e.preventDefault()
    if (!selectedPatient) {
      notify.warning('Please search and select a patient first')
      return
    }
    if (!walkInForm.doctorId) {
      notify.warning('Please select a doctor for patient assignment')
      return
    }
    setShowConfirmDialog(true)
  }

  // Execute API check-in after confirmation
  const executeWalkInCheckIn = async () => {
    setWalkInSubmitting(true)
    setError('')

    try {
      const res = await checkInWalkIn({
        patientId: selectedPatient._id || selectedPatient.id,
        doctorId: walkInForm.doctorId,
        reason: walkInForm.reason,
        type: walkInForm.type,
      })

      const assignedDoc = doctors.find((d) => (d._id || d.id) === walkInForm.doctorId)
      const docName = assignedDoc?.name || `Dr. ${assignedDoc?.firstName || ''} ${assignedDoc?.lastName || ''}`.trim() || 'Doctor'

      notify.success(`Patient checked in! Token generated: ${res.token}`)
      setShowConfirmDialog(false)
      setShowWalkInModal(false)

      setTokenTicket({
        token: res.token,
        opNumber: res.visit?.opNumber,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        patientId: selectedPatient.patientId,
        doctorName: docName,
        date: new Date().toLocaleDateString('en-IN'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })

      fetchQueue()
    } catch (err) {
      const errMsg = err.message || 'Walk-in check-in failed'
      setError(errMsg)
      notify.error(errMsg)
      setShowConfirmDialog(false)
    } finally {
      setWalkInSubmitting(false)
    }
  }

  const handleStatusChange = async (visitId, newStatus) => {
    try {
      await updateQueueStatus(visitId, newStatus)
      notify.info(`Queue status updated to ${newStatus}`)
      fetchQueue()
    } catch (err) {
      console.error('Failed to update status:', err)
      notify.error(err.message || 'Failed to update queue status')
    }
  }

  const handleStartConsultationFromQueue = async (visit) => {
    try {
      const patId = visit.patient?._id || visit.patient?.id || visit.patient
      if (!patId) throw new Error('Patient ID not found for this queue item')
      await updateQueueStatus(visit._id || visit.id, 'in-progress')
      const res = await createConsultation({ patientId: patId, visitId: visit._id || visit.id })
      const cons = res.consultation
      navigate(`/portal/consultations/${cons._id || cons.id}`)
    } catch (err) {
      notify.error(err.message || 'Failed to start consultation session')
    }
  }

  // Filtered queue items
  const filteredVisits = visits.filter((v) => {
    if (!searchQueue.trim()) return true
    const q = searchQueue.toLowerCase()
    const pName = v.patient ? `${v.patient.firstName || ''} ${v.patient.lastName || ''}`.toLowerCase() : ''
    const pId = v.patient?.patientId ? String(v.patient.patientId).toLowerCase() : ''
    const tokenStr = v.token ? String(v.token).toLowerCase() : ''
    const docName = v.doctor?.name ? String(v.doctor.name).toLowerCase() : ''
    return pName.includes(q) || pId.includes(q) || tokenStr.includes(q) || docName.includes(q)
  })

  const waitingVisits = filteredVisits.filter((v) => v.status === 'registered')
  const inProgressVisits = filteredVisits.filter((v) => v.status === 'in-progress')
  const completedVisits = filteredVisits.filter((v) => v.status === 'completed')

  const selectedDoctorObj = doctors.find((d) => (d._id || d.id) === walkInForm.doctorId)
  const selectedDocName = selectedDoctorObj?.name || (selectedDoctorObj ? `Dr. ${selectedDoctorObj.firstName || ''} ${selectedDoctorObj.lastName || ''}`.trim() : 'Selected Doctor')

  return (
    <div className="portal-page">
      {/* Header & Quick Action Banner */}
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck className="text-primary" size={26} /> {isDoctor ? 'My Waiting List' : 'Check-in & Queue Hub'}
          </h1>
          <p>{isDoctor ? 'View your assigned waiting patients and start consultations' : 'Issue patient tokens, assign doctors, and monitor live queue flow (Waiting → In Consultation → Completed)'}</p>
        </div>
        {!isDoctor && (
          <button type="button" className="btn btn-primary" onClick={openWalkInModal} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600 }}>
            <Plus size={18} /> Check-in Walk-in Patient
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger mb-4" role="alert" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button type="button" className="close-btn" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Overview Stat Badges */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div className="card" style={{ background: '#fff', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #0284c7' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'block' }}>Total Queue Today</span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{visits.length}</span>
        </div>
        <div className="card" style={{ background: '#fff', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #0284c7' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0369a1', display: 'block' }}>Waiting Patients</span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7' }}>{visits.filter(v => v.status === 'registered').length}</span>
        </div>
        <div className="card" style={{ background: '#fff', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #7c3aed' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6d28d9', display: 'block' }}>In Consultation</span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#7c3aed' }}>{visits.filter(v => v.status === 'in-progress').length}</span>
        </div>
        <div className="card" style={{ background: '#fff', padding: '14px 18px', borderRadius: '10px', borderLeft: '4px solid #16a34a' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', display: 'block' }}>Completed</span>
          <span style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a' }}>{visits.filter(v => v.status === 'completed').length}</span>
        </div>
      </div>

      {/* Control & Filter Toolbar */}
      <div className="card mb-6" style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Queue Date
              </label>
              <input
                type="date"
                className="form-control"
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>

            {!isDoctor && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Filter Doctor
                </label>
                <select
                  className="form-control"
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '180px' }}
                  value={filterDoctor}
                  onChange={(e) => setFilterDoctor(e.target.value)}
                >
                  <option value="">All Doctors</option>
                  {doctors.map((d, idx) => (
                    <option key={d._id || d.id || idx} value={d._id || d.id}>
                      Dr. {d.name || `${d.firstName || ''} ${d.lastName || ''}`.trim()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Search Queue
              </label>
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Patient, ID, or Token..."
                  value={searchQueue}
                  onChange={(e) => setSearchQueue(e.target.value)}
                  style={{ paddingLeft: '30px', height: '34px', fontSize: '13px' }}
                />
                <Search size={14} style={{ position: 'absolute', left: '9px', top: '10px', color: '#94a3b8' }} />
              </div>
            </div>
          </div>

          <div>
            <button type="button" className="btn btn-secondary" onClick={fetchQueue} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={14} /> Refresh Board
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Live Queue Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '20px' }}>

        {/* Column 1: Waiting Queue */}
        <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderTop: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} /> Waiting Queue ({waitingVisits.length})
            </h3>
          </div>

          {loading && visits.length === 0 ? (
            <SkeletonList items={3} />
          ) : waitingVisits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '13px' }}>
              No patients waiting in queue for selected criteria.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {waitingVisits.map((v) => (
                <div
                  key={v._id || v.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '14px',
                    background: '#f8fafc',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#0284c7', background: '#e0f2fe', padding: '3px 10px', borderRadius: '6px', letterSpacing: '0.02em' }}>
                      Token #{v.token || 'T-???'}
                    </span>
                    <span className="badge badge-subtle" style={{ fontSize: '11px' }}>{v.opNumber || 'OP Visit'}</span>
                  </div>

                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>
                    {v.patient ? `${v.patient.firstName || ''} ${v.patient.lastName || ''}`.trim() : 'Unknown Patient'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 8px 0' }}>
                    ID: {v.patient?.patientId || '—'} • Phone: {v.patient?.phone || '—'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', marginBottom: '12px', background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                    Doctor: <strong>{v.doctor?.name || 'Unassigned'}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ flex: 1, padding: '7px', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                      onClick={() => handleStartConsultationFromQueue(v)}
                    >
                      <Stethoscope size={14} /> Start Consultation
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '7px 10px' }}
                      onClick={() =>
                        setTokenTicket({
                          token: v.token,
                          opNumber: v.opNumber,
                          patientName: `${v.patient?.firstName || ''} ${v.patient?.lastName || ''}`.trim(),
                          patientId: v.patient?.patientId,
                          doctorName: v.doctor?.name,
                          date: new Date(v.opDate || Date.now()).toLocaleDateString('en-IN'),
                          time: new Date(v.opDate || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        })
                      }
                      title="Print Token Ticket"
                    >
                      <Printer size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: In Consultation */}
        <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderTop: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} /> In Consultation ({inProgressVisits.length})
            </h3>
          </div>

          {loading && visits.length === 0 ? (
            <SkeletonList items={2} />
          ) : inProgressVisits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '13px' }}>
              No active consultations right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {inProgressVisits.map((v) => (
                <div
                  key={v._id || v.id}
                  style={{
                    border: '1px solid #ddd6fe',
                    borderRadius: '10px',
                    padding: '14px',
                    background: '#f5f3ff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#7c3aed', background: '#ede9fe', padding: '3px 10px', borderRadius: '6px' }}>
                      Token #{v.token || 'T-???'}
                    </span>
                    <span className="badge badge-subtle">{v.opNumber || 'OP Visit'}</span>
                  </div>

                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>
                    {v.patient ? `${v.patient.firstName || ''} ${v.patient.lastName || ''}`.trim() : 'Unknown Patient'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 8px 0' }}>
                    ID: {v.patient?.patientId || '—'} • Phone: {v.patient?.phone || '—'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155', marginBottom: '12px', background: '#fff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #ddd6fe' }}>
                    With Doctor: <strong>{v.doctor?.name || 'Unassigned'}</strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn-success"
                    style={{ width: '100%', padding: '8px', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontWeight: 600, background: '#059669', color: '#fff', border: 'none', borderRadius: '6px' }}
                    onClick={() => handleStatusChange(v._id || v.id, 'completed')}
                  >
                    <CheckCircle size={15} /> Mark Consultation Completed
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Completed Today */}
        <div className="card" style={{ background: '#fff', padding: '18px', borderRadius: '12px', borderTop: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#15803d', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} /> Completed Today ({completedVisits.length})
            </h3>
          </div>

          {loading && visits.length === 0 ? (
            <SkeletonList items={2} />
          ) : completedVisits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '13px' }}>
              No completed visits recorded yet today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
              {completedVisits.map((v) => (
                <div
                  key={v._id || v.id}
                  style={{
                    border: '1px solid #dcfce7',
                    borderRadius: '8px',
                    padding: '12px',
                    background: '#f0fdf4',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                      {v.patient ? `${v.patient.firstName || ''} ${v.patient.lastName || ''}`.trim() : 'Unknown Patient'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Token #{v.token} • {v.doctor?.name || 'Doctor'}
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                    Completed
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Walk-in Check-in Form Modal */}
      <Modal
        open={showWalkInModal}
        onClose={() => setShowWalkInModal(false)}
        title="Check-in Walk-in Patient"
        subtitle="Search patient record and assign to an available doctor"
        maxWidth="560px"
      >
        <form onSubmit={handleWalkInSubmit}>
          {/* Step 1: Patient Search & Select */}
          <div style={{ marginBottom: '18px', background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              1. Search & Select Patient
            </label>

            {selectedPatient ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e0f2fe', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#0369a1', fontSize: '14px' }}>
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </div>
                  <div style={{ fontSize: '12px', color: '#0284c7' }}>
                    ID: {selectedPatient.patientId} • Phone: {selectedPatient.phone || 'No phone'}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  style={{ color: '#0369a1', fontWeight: 600 }}
                  onClick={() => {
                    setSelectedPatient(null)
                    setPatientSearch('')
                  }}
                >
                  Change Patient
                </button>
              </div>
            ) : (
              <div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    placeholder="Type patient name, mobile, or PAT-..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                  />
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '12px', color: '#94a3b8' }} />
                </div>

                {matchingPatients.length > 0 && (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '6px', background: '#fff', maxHeight: '160px', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    {matchingPatients.map((p, idx) => (
                      <div
                        key={p._id || p.id || idx}
                        style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}
                        onClick={() => {
                          setSelectedPatient(p)
                          setMatchingPatients([])
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                          {p.firstName} {p.lastName} <span style={{ color: '#64748b', fontWeight: 400 }}>({p.patientId})</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Phone: {p.phone || 'No phone'} • City: {p.city || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Doctor Assignment & Details */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              2. Assign Doctor
            </label>
            <select
              className="form-control"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              value={walkInForm.doctorId}
              onChange={(e) => setWalkInForm({ ...walkInForm, doctorId: e.target.value })}
            >
              {doctors.map((d, idx) => (
                <option key={d._id || d.id || idx} value={d._id || d.id}>
                  {d.name || `Dr. ${d.firstName || ''} ${d.lastName || ''}`.trim()} ({d.specialization || 'General Doctor'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
              3. Reason for Visit (Optional)
            </label>
            <input
              type="text"
              className="form-control"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              value={walkInForm.reason}
              onChange={(e) => setWalkInForm({ ...walkInForm, reason: e.target.value })}
              placeholder="e.g. Toothache, routine checkup, consultation"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowWalkInModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px', fontWeight: 600 }}>
              Check In Patient
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog before submitting Check-In */}
      <ConfirmationDialog
        open={showConfirmDialog}
        title="Confirm Patient Check-In"
        message={
          selectedPatient
            ? `Are you sure you want to check in ${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.patientId}) for ${selectedDocName}?`
            : 'Are you sure you want to check in this patient?'
        }
        confirmText="Confirm Check-In"
        cancelText="Cancel"
        loadingText="Generating Token..."
        loading={walkInSubmitting}
        variant="default"
        onConfirm={executeWalkInCheckIn}
        onCancel={() => setShowConfirmDialog(false)}
      />

      {/* Printable Token Ticket Modal */}
      <Modal
        open={Boolean(tokenTicket)}
        onClose={() => setTokenTicket(null)}
        title="Token Ticket"
        maxWidth="380px"
      >
        {tokenTicket && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '2px dashed #cbd5e1', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', letterSpacing: '0.03em' }}>SAI DENTAL CLINIC</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Patient Queue Token Ticket</div>
            </div>

            <div style={{ fontSize: '48px', fontWeight: '900', color: '#0284c7', margin: '10px 0' }}>
              Token #{tokenTicket.token}
            </div>

            <div style={{ textAlign: 'left', background: '#f8fafc', padding: '14px', borderRadius: '8px', fontSize: '13px', margin: '12px 0', border: '1px solid #e2e8f0', lineHeight: 1.6 }}>
              <div><strong>Patient:</strong> {tokenTicket.patientName}</div>
              <div><strong>Patient ID:</strong> {tokenTicket.patientId}</div>
              <div><strong>OP Visit #:</strong> {tokenTicket.opNumber}</div>
              <div><strong>Assigned Doctor:</strong> {tokenTicket.doctorName}</div>
              <div><strong>Date & Time:</strong> {tokenTicket.date} {tokenTicket.time}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setTokenTicket(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print Ticket
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
