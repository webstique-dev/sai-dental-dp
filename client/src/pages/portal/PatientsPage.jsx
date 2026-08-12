import { useState, useEffect } from 'react'
import { Search, Plus, UserCheck, AlertTriangle, Edit3, X, RefreshCw } from 'lucide-react'
import { listPatients, createPatient, updatePatient, checkDuplicatePatient } from '../../services/patientService'

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)
  const [form, setForm] = useState({
    title: 'Mr',
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'male',
    address: '',
    city: '',
    occupation: '',
    emergencyName: '',
    emergencyPhone: '',
    bloodGroup: 'unknown',
    alerts: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Duplicate warning state
  const [dupWarnings, setDupWarnings] = useState([])
  const [checkingDup, setCheckingDup] = useState(false)

  const fetchPatients = async (query = search) => {
    setLoading(true)
    setError('')
    try {
      const res = await listPatients({ search: query, limit: 50 })
      setPatients(res.items || [])
      setTotal(res.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()
  }, [])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    fetchPatients(search)
  }

  // Trigger duplicate check when phone or names change
  useEffect(() => {
    if (editingPatient) {
      setDupWarnings([])
      return
    }
    const { phone, firstName, lastName } = form
    if ((phone && phone.length >= 7) || (firstName.trim() && lastName.trim())) {
      const timer = setTimeout(async () => {
        setCheckingDup(true)
        try {
          const res = await checkDuplicatePatient({ phone, firstName, lastName })
          if (res.isDuplicate) {
            setDupWarnings(res.matches || [])
          } else {
            setDupWarnings([])
          }
        } catch {
          // ignore error
        } finally {
          setCheckingDup(false)
        }
      }, 400)
      return () => clearTimeout(timer)
    } else {
      setDupWarnings([])
    }
  }, [form.phone, form.firstName, form.lastName, editingPatient])

  const openCreateModal = () => {
    setEditingPatient(null)
    setForm({
      title: 'Mr',
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      dob: '',
      gender: 'male',
      address: '',
      city: '',
      occupation: '',
      emergencyName: '',
      emergencyPhone: '',
      bloodGroup: 'unknown',
      alerts: '',
    })
    setDupWarnings([])
    setShowModal(true)
  }

  const openEditModal = (patient) => {
    setEditingPatient(patient)
    setForm({
      title: patient.title || 'Mr',
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      phone: patient.phone || '',
      email: patient.email || '',
      dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '',
      gender: patient.gender || 'male',
      address: patient.address || '',
      city: patient.city || '',
      occupation: patient.occupation || '',
      emergencyName: patient.emergencyContact?.name || '',
      emergencyPhone: patient.emergencyContact?.phone || '',
      bloodGroup: patient.bloodGroup || 'unknown',
      alerts: Array.isArray(patient.permanentAlerts) ? patient.permanentAlerts.join(', ') : '',
    })
    setDupWarnings([])
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and Last Name are required')
      return
    }
    setSubmitting(true)
    setError('')

    const payload = {
      title: form.title,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      dob: form.dob || null,
      gender: form.gender,
      address: form.address.trim(),
      city: form.city.trim(),
      occupation: form.occupation.trim(),
      emergencyContact: {
        name: form.emergencyName.trim(),
        phone: form.emergencyPhone.trim(),
      },
      bloodGroup: form.bloodGroup,
      permanentAlerts: form.alerts
        ? form.alerts.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    }

    try {
      if (editingPatient) {
        await updatePatient(editingPatient._id, payload)
        setNotice(`Patient "${payload.firstName} ${payload.lastName}" updated successfully!`)
      } else {
        await createPatient(payload)
        setNotice(`New patient "${payload.firstName} ${payload.lastName}" registered!`)
      }
      setShowModal(false)
      fetchPatients()
    } catch (err) {
      setError(err.message || 'Error saving patient')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="portal-page">
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1>Patient Registration & Directory</h1>
          <p>Register new intake walk-in/phone patients or search existing records</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> Register Patient
        </button>
      </div>

      {notice && (
        <div className="alert alert-success mb-4" role="alert">
          {notice}
          <button type="button" className="close-btn" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
          <button type="button" className="close-btn" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="card mb-6">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 items-center flex-wrap">
          <div className="input-group flex-1 min-w-[240px]" style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Patient Name, Phone, or Patient ID (PAT-...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button type="submit" className="btn btn-secondary" disabled={loading}>
              <Search size={16} /> Search
            </button>
            {search && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearch('')
                  fetchPatients('')
                }}
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Patients List */}
      <div className="card">
        <div className="card-header flex justify-between items-center mb-4">
          <h2 className="card-title">Registered Patients ({total})</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => fetchPatients()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading patients list...</div>
        ) : patients.length === 0 ? (
          <div className="text-center py-8 text-muted">
            No patient records found. Click "Register Patient" to add one.
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Patient ID</th>
                  <th style={{ padding: '10px' }}>Name</th>
                  <th style={{ padding: '10px' }}>Gender / Age</th>
                  <th style={{ padding: '10px' }}>Phone</th>
                  <th style={{ padding: '10px' }}>City</th>
                  <th style={{ padding: '10px' }}>Blood Group</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => (
                  <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px', fontWeight: '600' }}>
                      <span className="badge badge-subtle">{p.patientId}</span>
                    </td>
                    <td style={{ padding: '10px', fontWeight: '500' }}>
                      {p.title ? `${p.title}. ` : ''}
                      {p.firstName} {p.lastName}
                    </td>
                    <td style={{ padding: '10px', textTransform: 'capitalize' }}>
                      {p.gender} {p.age ? `(${p.age} yrs)` : ''}
                    </td>
                    <td style={{ padding: '10px' }}>{p.phone || '—'}</td>
                    <td style={{ padding: '10px' }}>{p.city || '—'}</td>
                    <td style={{ padding: '10px' }}>
                      <span className="badge badge-info">{p.bloodGroup || 'unknown'}</span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        title="Edit patient details"
                        onClick={() => openEditModal(p)}
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register / Edit Patient Modal */}
      {showModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content card" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', background: '#fff', padding: '24px', borderRadius: '12px' }}>
            <div className="modal-header flex justify-between items-center mb-4" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', pb: '12px' }}>
              <h3 style={{ margin: 0 }}>{editingPatient ? 'Edit Patient Details' : 'Register New Patient'}</h3>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Duplicate Warnings Alert */}
            {!editingPatient && dupWarnings.length > 0 && (
              <div className="alert alert-warning mb-4" style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '8px', color: '#92400e' }}>
                <div className="flex items-center gap-2 font-semibold mb-1" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} /> Potential Duplicate Patient(s) Found!
                </div>
                <p className="text-sm mb-2">Existing patients match this phone number or name:</p>
                <ul className="text-sm pl-4" style={{ margin: '4px 0 8px 16px' }}>
                  {dupWarnings.map((m) => (
                    <li key={m._id}>
                      <strong>{m.patientId}</strong>: {m.firstName} {m.lastName} ({m.phone || 'No phone'}) - {m.city || 'No city'}
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-muted">Please double check to prevent creating duplicate records.</div>
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Title</label>
                  <select
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Master">Master</option>
                    <option value="Dr">Dr</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>First Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="e.g. Ramesh"
                  />
                </div>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Last Name *</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="e.g. Kumar"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="10-digit mobile"
                  />
                </div>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Gender</label>
                  <select
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Date of Birth</label>
                  <input
                    type="date"
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>City / Town</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="e.g. Chennai"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Full Address</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, area, landmark"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Blood Group</label>
                  <select
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={form.bloodGroup}
                    onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                  >
                    <option value="unknown">Unknown</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Emergency Contact Name</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={form.emergencyName}
                    onChange={(e) => setForm({ ...form, emergencyName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Emergency Contact Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={form.emergencyPhone}
                    onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="field-label" style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Medical Alerts / Allergies (comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={form.alerts}
                  onChange={(e) => setForm({ ...form, alerts: e.target.value })}
                  placeholder="e.g. Penicillin Allergy, Diabetic, Hypertension"
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e2e8f0', pt: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingPatient ? 'Update Patient' : 'Save Patient Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
