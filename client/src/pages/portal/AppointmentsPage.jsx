import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Plus, Search, Filter, Edit3, XCircle, CheckCircle2, UserCheck, RefreshCw, Play, Stethoscope } from 'lucide-react'
import { listAppointments, createAppointment, updateAppointment, cancelAppointment } from '../../services/appointmentService'
import { listPatients } from '../../services/patientService'
import { checkInAppointment } from '../../services/checkInService'
import { createConsultation, patientConsultations } from '../../services/consultationService'
import { SkeletonTable } from '../../components/common/skeleton'
import { Modal, ReusableFormModal } from '../../components/common/modal'
import { useNotification } from '../../components/common/notification'
import { publicService } from '../../services/publicService'
import useAuth from '../../hooks/useAuth'

const SOURCE_BADGES = {
  'walk-in': { label: 'Walk-in', color: '#0284c7', bg: '#e0f2fe' },
  phone: { label: 'Phone Booking', color: '#7c3aed', bg: '#f3e8ff' },
  website: { label: 'Online Booking', color: '#059669', bg: '#d1fae5' },
  existing: { label: 'Existing Patient', color: '#4b5563', bg: '#f3f4f6' },
  other: { label: 'Other', color: '#4b5563', bg: '#f3f4f6' },
}

const STATUS_BADGES = {
  scheduled: { label: 'Scheduled', color: '#d97706', bg: '#fef3c7' },
  confirmed: { label: 'Confirmed', color: '#2563eb', bg: '#dbeafe' },
  'checked-in': { label: 'Checked In', color: '#059669', bg: '#d1fae5' },
  'in-consultation': { label: 'In Consultation', color: '#7c3aed', bg: '#f3e8ff' },
  completed: { label: 'Completed', color: '#16a34a', bg: '#dcfce7' },
  cancelled: { label: 'Cancelled', color: '#dc2626', bg: '#fee2e2' },
  'no-show': { label: 'No Show', color: '#6b7280', bg: '#f3f4f6' },
}

export default function AppointmentsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const notify = useNotification()
  const isDoctor = user?.role === 'doctor'
  const doctorIdVal = user?._id || user?.id || ''

  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Filters
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [filterDoctor, setFilterDoctor] = useState(isDoctor ? doctorIdVal : '')

  useEffect(() => {
    if (isDoctor && doctorIdVal) {
      setFilterDoctor(doctorIdVal)
      setBookingForm((prev) => ({ ...prev, doctorId: doctorIdVal }))
    }
  }, [isDoctor, doctorIdVal])
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  // Modal Book Appointment
  const [showBookModal, setShowBookModal] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [allPatientsList, setAllPatientsList] = useState([])
  const [fetchingPatients, setFetchingPatients] = useState(false)
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientHistory, setPatientHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Doctor Autocomplete States
  const [doctorSearch, setDoctorSearch] = useState('')
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false)
  const [selectedDoctorObj, setSelectedDoctorObj] = useState(null)

  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    type: 'New Consultation',
    source: 'phone',
    reason: '',
    notes: '',
  })
  const [bookingSubmitting, setBookingSubmitting] = useState(false)

  // Modal Edit Appointment
  const [editingApt, setEditingApt] = useState(null)
  const [editForm, setEditForm] = useState({
    doctorId: '',
    date: '',
    time: '',
    type: '',
    reason: '',
    notes: '',
    status: '',
    source: '',
  })

  // Modal Cancel Appointment
  const [cancellingApt, setCancellingApt] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  const fetchDoctorsList = async () => {
    try {
      const res = await publicService.listDoctors()
      const docs = Array.isArray(res) ? res : (res?.doctors || [])
      setDoctors(docs)
      if (docs.length > 0 && !bookingForm.doctorId) {
        setBookingForm((prev) => ({ ...prev, doctorId: docs[0]._id || docs[0].id || '' }))
      }
    } catch {
      // ignore error
    }
  }

  const fetchAppointmentsList = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listAppointments({
        date: filterDate,
        doctor: filterDoctor,
        status: filterStatus,
      })
      setAppointments(res.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load appointments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDoctorsList()
  }, [])

  useEffect(() => {
    fetchAppointmentsList()
  }, [filterDate, filterDoctor, filterStatus])

  const filteredAppointments = appointments.filter((apt) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchNum = apt.appointmentNumber?.toLowerCase().includes(q)
      const matchPat = (apt.patient?.firstName + ' ' + apt.patient?.lastName).toLowerCase().includes(q)
      const matchDoc = apt.doctor?.name?.toLowerCase().includes(q)
      if (!matchNum && !matchPat && !matchDoc) return false
    }
    if (typeFilter && apt.type !== typeFilter) return false
    if (sourceFilter && apt.source !== sourceFilter) return false
    return true
  })

  const clearApptFilters = () => {
    setSearchQuery('')
    setFilterDoctor('')
    setFilterStatus('')
    setTypeFilter('')
    setSourceFilter('')
  }

  // Fetch patients list for modal dropdown
  const fetchPatientsForModal = async (query = '') => {
    setFetchingPatients(true)
    try {
      const res = await listPatients({ search: query.trim(), limit: 50 })
      setAllPatientsList(res.items || res.patients || [])
    } catch {
      setAllPatientsList([])
    } finally {
      setFetchingPatients(false)
    }
  }

  useEffect(() => {
    if (!showBookModal) return
    const timer = setTimeout(() => {
      fetchPatientsForModal(patientSearch)
    }, 250)
    return () => clearTimeout(timer)
  }, [patientSearch, showBookModal])

  const openBookModal = () => {
    setSelectedPatient(null)
    setPatientSearch('')
    setAllPatientsList([])
    setShowPatientDropdown(false)
    setShowDoctorDropdown(false)
    setPatientHistory([])

    const initialDoc = doctors.length > 0 ? doctors[0] : null
    const initialDocName = initialDoc ? (initialDoc.name || `Dr. ${initialDoc.firstName || ''} ${initialDoc.lastName || ''}`.trim()) : ''

    setSelectedDoctorObj(initialDoc)
    setDoctorSearch(initialDocName)
    setBookingForm({
      doctorId: initialDoc ? (initialDoc._id || initialDoc.id) : '',
      type: 'New Consultation',
      source: 'phone',
      reason: '',
      notes: '',
    })
    setShowBookModal(true)

    // Pre-fetch patients so dropdown has items immediately on click
    fetchPatientsForModal('')
  }

  const handleSelectDoctor = (doc) => {
    const docName = doc.name || `Dr. ${doc.firstName || ''} ${doc.lastName || ''}`.trim()
    setSelectedDoctorObj(doc)
    setDoctorSearch(docName)
    setBookingForm((prev) => ({ ...prev, doctorId: doc._id || doc.id }))
    setShowDoctorDropdown(false)
  }

  const handleSelectPatient = async (p) => {
    setSelectedPatient(p)
    setShowPatientDropdown(false)
    setPatientSearch('')
    setLoadingHistory(true)
    try {
      const patId = p._id || p.id
      const res = await patientConsultations(patId)
      const items = res.items || res.consultations || []
      setPatientHistory(items)

      if (items.length > 0) {
        const last = items[0]
        const lastDocId = last.doctor?._id || last.doctor?.id || (typeof last.doctor === 'string' ? last.doctor : null)
        const matchedDoc = doctors.find((d) => (d._id || d.id) === lastDocId)

        if (matchedDoc) {
          handleSelectDoctor(matchedDoc)
        }

        setBookingForm((prev) => ({
          ...prev,
          type: 'Follow-up',
          source: 'existing',
        }))
      } else {
        setBookingForm((prev) => ({
          ...prev,
          type: 'New Consultation',
          source: 'phone',
        }))
      }
    } catch (err) {
      console.error('Failed to load patient history:', err)
      setPatientHistory([])
      setBookingForm((prev) => ({
        ...prev,
        type: 'New Consultation',
        source: 'phone',
      }))
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleBookSubmit = async (e) => {
    if (e) e.preventDefault()
    if (!selectedPatient) {
      setError('Please search and select a patient first')
      notify.warning('Please search and select a patient first')
      return
    }
    if (!bookingForm.doctorId) {
      setError('Please select an assigned doctor')
      notify.warning('Please select an assigned doctor')
      return
    }

    setBookingSubmitting(true)
    setError('')

    const todayStr = new Date().toISOString().split('T')[0]
    const autoTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

    try {
      await createAppointment({
        patient: selectedPatient._id || selectedPatient.id,
        doctor: bookingForm.doctorId,
        date: todayStr,
        time: autoTimeStr,
        type: bookingForm.type,
        source: bookingForm.source,
        reason: bookingForm.reason.trim(),
        notes: bookingForm.notes?.trim() || '',
      })

      notify.success(`Appointment booked for ${selectedPatient.firstName} ${selectedPatient.lastName} today at ${autoTimeStr}!`)
      setShowBookModal(false)
      fetchAppointmentsList()
    } catch (err) {
      const errMsg = err.message || 'Failed to book appointment'
      setError(errMsg)
      notify.error(errMsg)
    } finally {
      setBookingSubmitting(false)
    }
  }

  const openEditModal = (apt) => {
    setEditingApt(apt)
    setEditForm({
      doctorId: apt.doctor?._id || apt.doctor || '',
      date: apt.date ? new Date(apt.date).toISOString().split('T')[0] : '',
      time: apt.time || '',
      type: apt.type || 'New Consultation',
      reason: apt.reason || '',
      notes: apt.notes || '',
      status: apt.status || 'scheduled',
      source: apt.source || 'phone',
    })
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    try {
      await updateAppointment(editingApt._id, {
        doctor: editForm.doctorId,
        date: editForm.date,
        time: editForm.time,
        type: editForm.type,
        reason: editForm.reason,
        notes: editForm.notes,
        status: editForm.status,
        source: editForm.source,
      })
      notify.success('Appointment updated successfully!')
      setEditingApt(null)
      fetchAppointmentsList()
    } catch (err) {
      const errMsg = err.message || 'Failed to update appointment'
      setError(errMsg)
      notify.error(errMsg)
    }
  }

  const handleCancelSubmit = async (e) => {
    e.preventDefault()
    try {
      await cancelAppointment(cancellingApt._id, cancelReason)
      notify.info('Appointment cancelled.')
      setCancellingApt(null)
      setCancelReason('')
      fetchAppointmentsList()
    } catch (err) {
      const errMsg = err.message || 'Failed to cancel appointment'
      setError(errMsg)
      notify.error(errMsg)
    }
  }

  const handleCheckInNow = async (apt) => {
    try {
      const res = await checkInAppointment({ appointmentId: apt._id || apt.id })
      notify.success(`Patient checked in! Token: ${res.token}`)
      fetchAppointmentsList()

      const patId = apt.patient?._id || apt.patient?.id || apt.patient
      if (patId) {
        const consRes = await createConsultation({ patientId: patId, appointmentId: apt._id || apt.id })
        const cons = consRes.consultation
        navigate(`/portal/consultations/${cons._id || cons.id}`)
      }
    } catch (err) {
      const errMsg = err.message || 'Check-in failed'
      setError(errMsg)
      notify.error(errMsg)
    }
  }

  return (
    <div className="portal-page">
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{isDoctor ? 'My Appointments' : 'Appointment Management'}</h1>
          <p>{isDoctor ? 'View your assigned appointments and check in patients' : 'Schedule, view, assign doctor & time slots, and check in patients'}</p>
        </div>
        {!isDoctor && (
          <button type="button" className="btn btn-primary" onClick={openBookModal}>
            <Plus size={16} /> Book Appointment
          </button>
        )}
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
        <div className="flex gap-4 items-center flex-wrap" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Search Appointments
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Search appt#, patient or doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
            />
          </div>

          <div>
            <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} /> Select Date
            </label>
            <input
              type="date"
              className="form-control"
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {!isDoctor && (
            <div>
              <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                Filter Doctor
              </label>
              <select
                className="form-control"
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
              >
                <option value="">All Doctors</option>
                {doctors.map((d, idx) => (
                  <option key={d._id || d.id || idx} value={d._id || d.id}>
                    {d.name} ({d.specialization || 'Doctor'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="field-label" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Filter Status
            </label>
            <select
              className="form-control"
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked-in">Checked In</option>
              <option value="in-consultation">In Consultation</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {(searchQuery || filterDoctor || filterStatus) && (
            <div style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearApptFilters}>
                Clear
              </button>
            </div>
          )}

          <div style={{ marginLeft: 'auto', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={fetchAppointmentsList}>
              <RefreshCw size={14} /> Refresh List
            </button>
          </div>
        </div>
      </div>

      {/* Appointments List Table */}
      <div className="card">
        <div className="card-header flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 className="card-title">Appointments ({filteredAppointments.length})</h2>
        </div>

        {loading && appointments.length === 0 ? (
          <SkeletonTable rows={6} columns={7} />
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted">
            No appointments found for the selected date and filters.
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Appt # & Time</th>
                  <th style={{ padding: '10px' }}>Patient Details</th>
                  <th style={{ padding: '10px' }}>Doctor</th>
                  <th style={{ padding: '10px' }}>Consultation Type</th>
                  <th style={{ padding: '10px' }}>Source Channel</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((apt) => {
                  const srcBadge = SOURCE_BADGES[apt.source] || SOURCE_BADGES.other
                  const statusBadge = STATUS_BADGES[apt.status] || STATUS_BADGES.scheduled
                  return (
                    <tr key={apt._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{apt.appointmentNumber}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {apt.time || '10:00 AM'}
                        </div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: '500' }}>
                          {apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'Unknown Patient'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {apt.patient?.patientId} {apt.patient?.phone ? `• ${apt.patient.phone}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '10px', fontWeight: '500' }}>
                        {apt.doctor ? apt.doctor.name : 'Unassigned'}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div>{apt.type}</div>
                        {apt.reason && <div style={{ fontSize: '12px', color: '#64748b' }}>{apt.reason}</div>}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: srcBadge.color,
                            backgroundColor: srcBadge.bg,
                          }}
                        >
                          {srcBadge.label}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: statusBadge.color,
                            backgroundColor: statusBadge.bg,
                          }}
                        >
                          {statusBadge.label}
                        </span>
                        {apt.token && (
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', marginTop: '2px' }}>
                            Token: {apt.token}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          {apt.status !== 'checked-in' && apt.status !== 'completed' && apt.status !== 'cancelled' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => handleCheckInNow(apt)}
                              title="Check in patient to queue"
                            >
                              <UserCheck size={12} /> Check-in
                            </button>
                          )}
                          {!isDoctor && (
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => openEditModal(apt)}
                              title="Edit appointment"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                          {!isDoctor && apt.status !== 'cancelled' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              style={{ color: '#dc2626' }}
                              onClick={() => setCancellingApt(apt)}
                              title="Cancel appointment"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book Appointment Modal */}
      <ReusableFormModal
        open={showBookModal}
        onClose={() => setShowBookModal(false)}
        onSubmit={handleBookSubmit}
        title="Book New Appointment"
        submitText="Confirm Appointment"
        submitLoadingText="Booking..."
        submitting={bookingSubmitting}
        maxWidth="640px"
      >
        {/* Step 1: Searchable Patient Autocomplete Dropdown */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#0f172a' }}>
            Search & Select Patient *
          </label>
          {selectedPatient ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0f9ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <div>
                <strong style={{ color: '#0369a1', fontSize: '14px' }}>{selectedPatient.firstName} {selectedPatient.lastName}</strong>
                <span className="badge badge-subtle" style={{ marginLeft: '8px', fontSize: '11px', background: '#e0f2fe', color: '#0369a1' }}>{selectedPatient.patientId || 'PAT'}</span>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                  📞 {selectedPatient.phone || 'No phone registered'} | Gender: {selectedPatient.gender || '—'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                style={{ color: '#0369a1', fontWeight: 600 }}
                onClick={() => {
                  setSelectedPatient(null)
                  setPatientHistory([])
                  setPatientSearch('')
                  setShowPatientDropdown(true)
                  fetchPatientsForModal('')
                }}
              >
                Change Patient
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  placeholder="Click to view all patients or type name, ID, phone..."
                  value={patientSearch}
                  onFocus={() => {
                    setShowPatientDropdown(true)
                    if (allPatientsList.length === 0) fetchPatientsForModal('')
                  }}
                  onChange={(e) => {
                    setPatientSearch(e.target.value)
                    setShowPatientDropdown(true)
                  }}
                />
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              {/* Patient Dropdown Layer */}
              {showPatientDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                    marginTop: '4px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ padding: '6px 12px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Available Patients</span>
                    <span>{allPatientsList.length} results</span>
                  </div>
                  {fetchingPatients ? (
                    <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                      Loading patient list...
                    </div>
                  ) : allPatientsList.length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                      No patients found matching "{patientSearch}"
                    </div>
                  ) : (
                    allPatientsList.map((p, idx) => (
                      <div
                        key={p._id || p.id || idx}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          justify: 'space-between',
                          alignItems: 'center',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f9ff')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                        onClick={() => handleSelectPatient(p)}
                      >
                        <div>
                          <strong style={{ color: '#0f172a', fontSize: '13px' }}>{p.firstName} {p.lastName}</strong>
                          <span style={{ fontSize: '11px', color: '#0284c7', marginLeft: '6px', fontWeight: 600 }}>({p.patientId || 'PAT'})</span>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>📞 {p.phone || 'No phone'}</div>
                        </div>
                        <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600 }}>Select →</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Patient History Summary (If Patient Has Previous Records) */}
        {selectedPatient && loadingHistory && (
          <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: '6px', marginBottom: '14px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
            Checking patient history...
          </div>
        )}

        {selectedPatient && !loadingHistory && patientHistory.length > 0 && (
          <div style={{ marginBottom: '16px', background: '#f0f9ff', padding: '12px 14px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0369a1', marginBottom: '6px' }}>
              <Stethoscope size={15} /> Previous Records Found ({patientHistory.length} visit(s))
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '12px', color: '#1e293b' }}>
              <div>
                <strong>Last Visit:</strong> {new Date(patientHistory[0].createdAt || patientHistory[0].visitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <div>
                <strong>Attending Doctor:</strong> Dr. {patientHistory[0].doctor?.name || patientHistory[0].doctor?.firstName || 'Assigned Doctor'}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Diagnosis / History:</strong> {patientHistory[0].clinicalFindings?.primaryDiagnosis || patientHistory[0].clinicalFindings || 'Routine checkup record'}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Appointment Details Form */}
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          {/* Searchable Doctor Autocomplete */}
          <div style={{ position: 'relative' }}>
            <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Assigned Doctor *</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                placeholder="Search doctor or specialization..."
                value={doctorSearch}
                onFocus={() => setShowDoctorDropdown(true)}
                onChange={(e) => {
                  setDoctorSearch(e.target.value)
                  setShowDoctorDropdown(true)
                }}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>

            {showDoctorDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 99,
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
                  marginTop: '4px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                }}
              >
                {doctors.filter((d) => {
                  if (!doctorSearch.trim()) return true
                  const q = doctorSearch.toLowerCase().trim()
                  const dName = (d.name || `${d.firstName || ''} ${d.lastName || ''}`).toLowerCase()
                  const dSpec = (d.specialization || 'doctor').toLowerCase()
                  return dName.includes(q) || dSpec.includes(q)
                }).length === 0 ? (
                  <div style={{ padding: '10px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                    No doctors found matching "{doctorSearch}"
                  </div>
                ) : (
                  doctors
                    .filter((d) => {
                      if (!doctorSearch.trim()) return true
                      const q = doctorSearch.toLowerCase().trim()
                      const dName = (d.name || `${d.firstName || ''} ${d.lastName || ''}`).toLowerCase()
                      const dSpec = (d.specialization || 'doctor').toLowerCase()
                      return dName.includes(q) || dSpec.includes(q)
                    })
                    .map((d, idx) => {
                      const dName = d.name || `Dr. ${d.firstName || ''} ${d.lastName || ''}`.trim()
                      return (
                        <div
                          key={d._id || d.id || idx}
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                          onClick={() => handleSelectDoctor(d)}
                        >
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>{dName}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {d.specialization || 'General Dentistry'}
                          </span>
                        </div>
                      )
                    })
                )}
              </div>
            )}
          </div>

          <div>
            <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Intake Channel</label>
            <select
              className="form-control"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={bookingForm.source}
              onChange={(e) => setBookingForm({ ...bookingForm, source: e.target.value })}
            >
              <option value="phone">Phone Booking</option>
              <option value="walk-in">Walk-in</option>
              <option value="website">Online Website</option>
              <option value="existing">Existing Patient</option>
            </select>
          </div>

          <div>
            <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Visit Type</label>
            <select
              className="form-control"
              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={bookingForm.type}
              onChange={(e) => setBookingForm({ ...bookingForm, type: e.target.value })}
            >
              <option value="New Consultation">New Consultation</option>
              <option value="Follow-up">Follow-up</option>
              <option value="Routine Checkup">Routine Checkup</option>
              <option value="Dental Cleaning">Dental Cleaning</option>
              <option value="Procedure">Procedure</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Chief Complaint / Reason</label>
          <input
            type="text"
            className="form-control"
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            value={bookingForm.reason}
            onChange={(e) => setBookingForm({ ...bookingForm, reason: e.target.value })}
            placeholder="e.g. Tooth sensitivity, lower molar pain, follow-up root canal"
          />
        </div>

        {/* Automatic Today's Date & Current Time Notice */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
          <Clock size={14} color="#0284c7" /> Date & time automatically captured as <strong>Today ({new Date().toLocaleDateString('en-IN')})</strong> at current time.
        </div>
      </ReusableFormModal>

      {/* Edit Appointment Modal */}
      <Modal
        open={Boolean(editingApt)}
        onClose={() => setEditingApt(null)}
        title={editingApt ? `Edit Appointment ${editingApt.appointmentNumber}` : ''}
        maxWidth="550px"
      >
        {editingApt && (
          <form onSubmit={handleEditSubmit}>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Assign Doctor</label>
                <select
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={editForm.doctorId}
                  onChange={(e) => setEditForm({ ...editForm, doctorId: e.target.value })}
                >
                  {doctors.map((d, idx) => (
                    <option key={d._id || d.id || idx} value={d._id || d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Date</label>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Time</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={editForm.time}
                  onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                />
              </div>

              <div>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Status</label>
                <select
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked-in">Checked In</option>
                  <option value="in-consultation">In Consultation</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No Show</option>
                </select>
              </div>

              <div>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Source</label>
                <select
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={editForm.source}
                  onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                >
                  <option value="phone">Phone</option>
                  <option value="walk-in">Walk-in</option>
                  <option value="website">Website</option>
                  <option value="existing">Existing</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Reason</label>
              <input
                type="text"
                className="form-control"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingApt(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cancel Appointment Modal */}
      <Modal
        open={Boolean(cancellingApt)}
        onClose={() => setCancellingApt(null)}
        title={cancellingApt ? `Cancel Appointment ${cancellingApt.appointmentNumber}` : ''}
        maxWidth="450px"
      >
        {cancellingApt && (
          <form onSubmit={handleCancelSubmit}>
            <p className="text-sm text-muted mb-4" style={{ margin: '0 0 12px 0', color: '#64748b' }}>
              Are you sure you want to cancel this appointment?
            </p>
            <div style={{ marginBottom: '16px' }}>
              <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Reason for cancellation</label>
              <input
                type="text"
                required
                className="form-control"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Patient requested reschedule"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setCancellingApt(null)}>
                Keep Appointment
              </button>
              <button type="submit" className="btn btn-danger">
                Confirm Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
