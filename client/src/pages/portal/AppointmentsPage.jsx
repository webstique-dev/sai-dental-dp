import { useState, useEffect } from 'react'
import { Calendar, Clock, Plus, Search, Filter, Edit3, XCircle, CheckCircle2, UserCheck, RefreshCw } from 'lucide-react'
import { listAppointments, createAppointment, updateAppointment, cancelAppointment } from '../../services/appointmentService'
import { listPatients } from '../../services/patientService'
import { checkInAppointment } from '../../services/checkInService'
import { publicService } from '../../services/publicService'

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
  const [appointments, setAppointments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Filters
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [filterDoctor, setFilterDoctor] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Modal Book Appointment
  const [showBookModal, setShowBookModal] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [matchingPatients, setMatchingPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [bookingForm, setBookingForm] = useState({
    doctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM',
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
      setDoctors(res.doctors || [])
      if (res.doctors && res.doctors.length > 0 && !bookingForm.doctorId) {
        setBookingForm((prev) => ({ ...prev, doctorId: res.doctors[0]._id }))
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

  // Patient search in Book Modal
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

  const openBookModal = () => {
    setSelectedPatient(null)
    setPatientSearch('')
    setBookingForm({
      doctorId: doctors.length > 0 ? doctors[0]._id : '',
      date: filterDate || new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      type: 'New Consultation',
      source: 'phone',
      reason: '',
      notes: '',
    })
    setShowBookModal(true)
  }

  const handleBookSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPatient) {
      setError('Please search and select a patient first')
      return
    }
    if (!bookingForm.doctorId) {
      setError('Please select an assigned doctor')
      return
    }

    setBookingSubmitting(true)
    setError('')

    try {
      await createAppointment({
        patient: selectedPatient._id,
        doctor: bookingForm.doctorId,
        date: bookingForm.date,
        time: bookingForm.time,
        type: bookingForm.type,
        source: bookingForm.source,
        reason: bookingForm.reason.trim(),
        notes: bookingForm.notes.trim(),
      })

      setNotice(`Appointment booked successfully for ${selectedPatient.firstName} ${selectedPatient.lastName}!`)
      setShowBookModal(false)
      fetchAppointmentsList()
    } catch (err) {
      setError(err.message || 'Failed to book appointment')
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
      setNotice('Appointment updated successfully!')
      setEditingApt(null)
      fetchAppointmentsList()
    } catch (err) {
      setError(err.message || 'Failed to update appointment')
    }
  }

  const handleCancelSubmit = async (e) => {
    e.preventDefault()
    try {
      await cancelAppointment(cancellingApt._id, cancelReason)
      setNotice('Appointment cancelled.')
      setCancellingApt(null)
      setCancelReason('')
      fetchAppointmentsList()
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment')
    }
  }

  const handleCheckInNow = async (apt) => {
    try {
      const res = await checkInAppointment({ appointmentId: apt._id })
      setNotice(`Patient checked in successfully! Generated Token: ${res.token}`)
      fetchAppointmentsList()
    } catch (err) {
      setError(err.message || 'Check-in failed')
    }
  }

  return (
    <div className="portal-page">
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Appointment Management</h1>
          <p>Schedule, view, assign doctor & time slots, and check in patients</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openBookModal}>
          <Plus size={16} /> Book Appointment
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
        <div className="flex gap-4 items-center flex-wrap" style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.specialization || 'Doctor'})
                </option>
              ))}
            </select>
          </div>

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

          <div style={{ marginLeft: 'auto' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={fetchAppointmentsList}>
              <RefreshCw size={14} /> Refresh List
            </button>
          </div>
        </div>
      </div>

      {/* Appointments List Table */}
      <div className="card">
        <div className="card-header flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 className="card-title">Appointments ({appointments.length})</h2>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading appointments...</div>
        ) : appointments.length === 0 ? (
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
                {appointments.map((apt) => {
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
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => openEditModal(apt)}
                            title="Edit appointment"
                          >
                            <Edit3 size={14} />
                          </button>
                          {apt.status !== 'cancelled' && (
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
      {showBookModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content card" style={{ width: '100%', maxWidth: '600px', background: '#fff', padding: '24px', borderRadius: '12px' }}>
            <div className="modal-header flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', pb: '12px' }}>
              <h3 style={{ margin: 0 }}>Book New Appointment</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setShowBookModal(false)}>
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleBookSubmit}>
              {/* Step 1: Select Patient */}
              <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                  1. Search & Select Patient *
                </label>
                {selectedPatient ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e0f2fe', padding: '8px 12px', borderRadius: '6px' }}>
                    <div>
                      <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong> ({selectedPatient.patientId}) - {selectedPatient.phone}
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
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', marginTop: '4px', background: '#fff', maxHeight: '150px', overflowY: 'auto' }}>
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

              {/* Step 2: Appointment Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Assigned Doctor *</label>
                  <select
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={bookingForm.doctorId}
                    onChange={(e) => setBookingForm({ ...bookingForm, doctorId: e.target.value })}
                  >
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.specialization || 'Doctor'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Appointment Date *</label>
                  <input
                    type="date"
                    required
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={bookingForm.date}
                    onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Time Slot</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={bookingForm.time}
                    onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                    placeholder="e.g. 10:30 AM"
                  />
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
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Type</label>
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
                  placeholder="e.g. Tooth sensitivity, lower molar pain"
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', pt: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowBookModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={bookingSubmitting}>
                  {bookingSubmitting ? 'Booking...' : 'Confirm Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {editingApt && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content card" style={{ width: '100%', maxWidth: '550px', background: '#fff', padding: '24px', borderRadius: '12px' }}>
            <div className="modal-header flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', pb: '12px' }}>
              <h3 style={{ margin: 0 }}>Edit Appointment {editingApt.appointmentNumber}</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setEditingApt(null)}>
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Assign Doctor</label>
                  <select
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={editForm.doctorId}
                    onChange={(e) => setEditForm({ ...editForm, doctorId: e.target.value })}
                  >
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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

              <div style={{ marginBottom: '12px' }}>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Reason</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', pt: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingApt(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Appointment Modal */}
      {cancellingApt && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content card" style={{ width: '100%', maxWidth: '450px', background: '#fff', padding: '24px', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#dc2626' }}>Cancel Appointment {cancellingApt.appointmentNumber}?</h3>
            <p className="text-sm text-muted mb-4">Are you sure you want to cancel this appointment?</p>

            <form onSubmit={handleCancelSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Reason for cancellation</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Patient requested cancellation, doctor unavailable"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setCancellingApt(null)}>
                  Keep Appointment
                </button>
                <button type="submit" className="btn btn-danger" style={{ background: '#dc2626', color: '#fff', padding: '8px 16px', borderRadius: '6px', border: 'none' }}>
                  Cancel Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
