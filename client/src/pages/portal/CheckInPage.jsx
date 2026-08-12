import { useState, useEffect } from 'react'
import { UserCheck, Clock, User, CheckCircle, Play, Printer, Plus, RefreshCw, XCircle } from 'lucide-react'
import { getQueueList, checkInWalkIn, updateQueueStatus } from '../../services/checkInService'
import { listPatients } from '../../services/patientService'
import { publicService } from '../../services/publicService'
import { SkeletonList } from '../../components/common/skeleton'

export default function CheckInPage() {
  const [visits, setVisits] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Filters
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [filterDoctor, setFilterDoctor] = useState('')

  // Walk-in modal
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [matchingPatients, setMatchingPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [walkInForm, setWalkInForm] = useState({
    doctorId: '',
    reason: 'Walk-in consultation',
    type: 'Walk-in Consultation',
  })
  const [walkInSubmitting, setWalkInSubmitting] = useState(false)

  // Token print card preview modal
  const [tokenTicket, setTokenTicket] = useState(null)

  const fetchQueue = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getQueueList({ date: filterDate, doctor: filterDoctor })
      setVisits(res.visits || [])
    } catch (err) {
      setError(err.message || 'Failed to load check-in queue')
    } finally {
      setLoading(false)
    }
  }

  const fetchDoctors = async () => {
    try {
      const res = await publicService.listDoctors()
      setDoctors(res.doctors || [])
      if (res.doctors && res.doctors.length > 0 && !walkInForm.doctorId) {
        setWalkInForm((prev) => ({ ...prev, doctorId: res.doctors[0]._id }))
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchDoctors()
  }, [])

  useEffect(() => {
    fetchQueue()
  }, [filterDate, filterDoctor])

  useEffect(() => {
    if (patientSearch.trim().length >= 2) {
      const timer = setTimeout(async () => {
        try {
          const res = await listPatients({ search: patientSearch.trim(), limit: 8 })
          setMatchingPatients(res.items || [])
        } catch {
          // ignore
        }
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setMatchingPatients([])
    }
  }, [patientSearch])

  const openWalkInModal = () => {
    setSelectedPatient(null)
    setPatientSearch('')
    setWalkInForm({
      doctorId: doctors.length > 0 ? doctors[0]._id : '',
      reason: 'Walk-in consultation',
      type: 'Walk-in Consultation',
    })
    setShowWalkInModal(true)
  }

  const handleWalkInSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPatient) {
      setError('Please search and select a patient')
      return
    }
    if (!walkInForm.doctorId) {
      setError('Please select a doctor')
      return
    }

    setWalkInSubmitting(true)
    setError('')

    try {
      const res = await checkInWalkIn({
        patientId: selectedPatient._id,
        doctorId: walkInForm.doctorId,
        reason: walkInForm.reason,
        type: walkInForm.type,
      })

      setNotice(`Walk-in patient checked in! Generated Token: ${res.token}`)
      setShowWalkInModal(false)
      setTokenTicket({
        token: res.token,
        opNumber: res.visit?.opNumber,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        patientId: selectedPatient.patientId,
        doctorName: doctors.find((d) => d._id === walkInForm.doctorId)?.name || 'Doctor',
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      })
      fetchQueue()
    } catch (err) {
      setError(err.message || 'Walk-in check-in failed')
    } finally {
      setWalkInSubmitting(false)
    }
  }

  const handleStatusChange = async (visitId, newStatus) => {
    try {
      await updateQueueStatus(visitId, newStatus)
      fetchQueue()
    } catch (err) {
      setError(err.message || 'Failed to update queue status')
    }
  }

  const waitingVisits = visits.filter((v) => v.status === 'registered')
  const inProgressVisits = visits.filter((v) => v.status === 'in-progress')
  const completedVisits = visits.filter((v) => v.status === 'completed')

  return (
    <div className="portal-page">
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Check-in & Queue Hub</h1>
          <p>Generate daily patient tokens and track live queue status (Waiting → With Doctor → Completed)</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openWalkInModal}>
          <Plus size={16} /> Check-in Walk-in Patient
        </button>
      </div>

      {notice && (
        <div className="alert alert-success mb-4" role="alert">
          {notice}
          <button type="button" className="close-btn" onClick={() => setNotice('')}>×</button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
          <button type="button" className="close-btn" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card mb-6" style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <div className="flex gap-4 items-center flex-wrap" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Queue Date
            </label>
            <input
              type="date"
              className="form-control"
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Doctor
            </label>
            <select
              className="form-control"
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
            >
              <option value="">All Doctors</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={fetchQueue}>
              <RefreshCw size={14} /> Refresh Queue
            </button>
          </div>
        </div>
      </div>

      {/* 3-Column Queue Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        {/* Column 1: Waiting Queue */}
        <div className="card" style={{ background: '#fff', padding: '16px', borderRadius: '12px', borderTop: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', pb: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={18} /> Waiting Queue ({waitingVisits.length})
            </h3>
          </div>

          {loading && visits.length === 0 ? (
            <SkeletonList items={3} />
          ) : waitingVisits.length === 0 ? (
            <div className="text-center py-6 text-muted" style={{ fontSize: '13px' }}>
              No patients waiting in queue.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {waitingVisits.map((v) => (
                <div
                  key={v._id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                    background: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#0284c7', background: '#e0f2fe', padding: '2px 8px', borderRadius: '6px' }}>
                      {v.token || 'T-???'}
                    </span>
                    <span className="badge badge-subtle">{v.opNumber}</span>
                  </div>

                  <div style={{ fontWeight: '600', fontSize: '15px' }}>
                    {v.patient ? `${v.patient.firstName} ${v.patient.lastName}` : 'Unknown'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                    {v.patient?.patientId} • Phone: {v.patient?.phone || '—'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                    Doctor: <strong>{v.doctor?.name || 'Unassigned'}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ flex: 1, padding: '6px', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleStatusChange(v._id, 'in-progress')}
                    >
                      <Play size={12} /> Call Patient (With Doctor)
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      style={{ padding: '6px' }}
                      onClick={() =>
                        setTokenTicket({
                          token: v.token,
                          opNumber: v.opNumber,
                          patientName: `${v.patient?.firstName} ${v.patient?.lastName}`,
                          patientId: v.patient?.patientId,
                          doctorName: v.doctor?.name,
                          date: new Date(v.opDate).toLocaleDateString(),
                          time: new Date(v.opDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        })
                      }
                      title="Print Token Ticket"
                    >
                      <Printer size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: In Consultation */}
        <div className="card" style={{ background: '#fff', padding: '16px', borderRadius: '12px', borderTop: '4px solid #7c3aed' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', pb: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={18} /> In Consultation ({inProgressVisits.length})
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted">Loading queue...</div>
          ) : inProgressVisits.length === 0 ? (
            <div className="text-center py-6 text-muted" style={{ fontSize: '13px' }}>
              No active consultation right now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {inProgressVisits.map((v) => (
                <div
                  key={v._id}
                  style={{
                    border: '1px solid #ddd6fe',
                    borderRadius: '8px',
                    padding: '12px',
                    background: '#f5f3ff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#7c3aed', background: '#ede9fe', padding: '2px 8px', borderRadius: '6px' }}>
                      {v.token || 'T-???'}
                    </span>
                    <span className="badge badge-subtle">{v.opNumber}</span>
                  </div>

                  <div style={{ fontWeight: '600', fontSize: '15px' }}>
                    {v.patient ? `${v.patient.firstName} ${v.patient.lastName}` : 'Unknown'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                    {v.patient?.patientId} • Phone: {v.patient?.phone || '—'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
                    With Doctor: <strong>{v.doctor?.name || 'Unassigned'}</strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-success"
                    style={{ width: '100%', padding: '6px', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px' }}
                    onClick={() => handleStatusChange(v._id, 'completed')}
                  >
                    <CheckCircle size={14} /> Mark Consultation Completed
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 3: Completed Today */}
        <div className="card" style={{ background: '#fff', padding: '16px', borderRadius: '12px', borderTop: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', pb: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={18} /> Completed Today ({completedVisits.length})
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-4 text-muted">Loading queue...</div>
          ) : completedVisits.length === 0 ? (
            <div className="text-center py-6 text-muted" style={{ fontSize: '13px' }}>
              No completed visits yet today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
              {completedVisits.map((v) => (
                <div
                  key={v._id}
                  style={{
                    border: '1px solid #dcfce7',
                    borderRadius: '8px',
                    padding: '10px',
                    background: '#f0fdf4',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                      {v.patient ? `${v.patient.firstName} ${v.patient.lastName}` : 'Unknown'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Token {v.token} • {v.doctor?.name}
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ background: '#dcfce7', color: '#15803d' }}>
                    Done
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Walk-in Check-in Modal */}
      {showWalkInModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content card" style={{ width: '100%', maxWidth: '550px', background: '#fff', padding: '24px', borderRadius: '12px' }}>
            <div className="modal-header flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', pb: '12px' }}>
              <h3 style={{ margin: 0 }}>Check-in Walk-in Patient</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setShowWalkInModal(false)}>
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit}>
              {/* Select Patient */}
              <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  1. Search & Select Patient *
                </label>
                {selectedPatient ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e0f2fe', padding: '8px 12px', borderRadius: '6px' }}>
                    <div>
                      <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong> ({selectedPatient.patientId})
                    </div>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedPatient(null)}>
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      className="form-control"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      placeholder="Type patient name, phone, or PAT-..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                    />
                    {matchingPatients.length > 0 && (
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', background: '#fff', maxHeight: '140px', overflowY: 'auto' }}>
                        {matchingPatients.map((p) => (
                          <div
                            key={p._id}
                            style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                            onClick={() => {
                              setSelectedPatient(p)
                              setMatchingPatients([])
                            }}
                          >
                            <strong>{p.firstName} {p.lastName}</strong> ({p.patientId}) - {p.phone || 'No phone'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Select Doctor & Details */}
              <div style={{ marginBottom: '12px' }}>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Assign Doctor *</label>
                <select
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={walkInForm.doctorId}
                  onChange={(e) => setWalkInForm({ ...walkInForm, doctorId: e.target.value })}
                >
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.specialization || 'Doctor'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Reason for Visit</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={walkInForm.reason}
                  onChange={(e) => setWalkInForm({ ...walkInForm, reason: e.target.value })}
                  placeholder="e.g. Toothache, routine checkup, walk-in emergency"
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', pt: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowWalkInModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={walkInSubmitting}>
                  {walkInSubmitting ? 'Checking in...' : 'Generate Token & Check In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Token Ticket Preview Modal */}
      {tokenTicket && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content card" style={{ width: '100%', maxWidth: '380px', background: '#fff', padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ borderBottom: '2px dashed #cbd5e1', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>SAI DENTAL CLINIC</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Patient Queue Token Ticket</div>
            </div>

            <div style={{ fontSize: '48px', fontWeight: '900', color: '#0284c7', margin: '8px 0' }}>
              {tokenTicket.token}
            </div>

            <div style={{ textAlign: 'left', background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '13px', margin: '12px 0' }}>
              <div><strong>Patient:</strong> {tokenTicket.patientName}</div>
              <div><strong>ID:</strong> {tokenTicket.patientId}</div>
              <div><strong>OP #:</strong> {tokenTicket.opNumber}</div>
              <div><strong>Doctor:</strong> {tokenTicket.doctorName}</div>
              <div><strong>Time:</strong> {tokenTicket.date} {tokenTicket.time}</div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
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
                style={{ flex: 1 }}
                onClick={() => window.print()}
              >
                <Printer size={14} /> Print Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
