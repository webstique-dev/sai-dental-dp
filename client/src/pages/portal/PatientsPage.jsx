import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, UserCheck, AlertTriangle, Edit3, X, RefreshCw, Check, User, Heart, Pill, Activity, Cigarette, ClipboardList, Stethoscope } from 'lucide-react'
import { listPatients, createPatient, updatePatient, checkDuplicatePatient } from '../../services/patientService'
import { createConsultation } from '../../services/consultationService'
import { SkeletonTable } from '../../components/common/skeleton'
import { Modal, ReusableFormModal } from '../../components/common/modal'
import { useNotification } from '../../components/common/notification'
import useAuth from '../../hooks/useAuth'

const EMPTY_MEDICAL = {
  diabetesMellitus: false,
  hypertension: false,
  asthma: false,
  allergy: false,
  pregnancy: false,
  cardiacDisease: false,
  epilepsy: false,
  thyroidDisorder: false,
  hepatitis: false,
  bleedingDisorder: false,
  other: '',
}

const EMPTY_HABITS = { smoking: false, tobacco: false, alcohol: false, pan: false }
const EMPTY_VITALS = { bp: '', rbs: '' }

const MEDICAL_CONDITIONS = [
  { key: 'diabetesMellitus', label: 'Diabetes Mellitus' },
  { key: 'hypertension', label: 'Hypertension' },
  { key: 'asthma', label: 'Asthma' },
  { key: 'allergy', label: 'Allergy' },
  { key: 'pregnancy', label: 'Pregnancy' },
  { key: 'cardiacDisease', label: 'Cardiac Disease' },
  { key: 'epilepsy', label: 'Epilepsy' },
  { key: 'thyroidDisorder', label: 'Thyroid Disorder' },
  { key: 'hepatitis', label: 'Hepatitis' },
  { key: 'bleedingDisorder', label: 'Bleeding Disorder' },
]

const HABIT_OPTIONS = [
  { key: 'smoking', label: 'Smoking' },
  { key: 'tobacco', label: 'Tobacco' },
  { key: 'alcohol', label: 'Alcohol' },
  { key: 'pan', label: 'Pan' },
]

const INITIAL_FORM = {
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
  manualAge: '',
  emergencyName: '',
  emergencyPhone: '',
  bloodGroup: 'unknown',
  alerts: '',
  medicalHistory: { ...EMPTY_MEDICAL },
  currentMedications: '',
  vitals: { ...EMPTY_VITALS },
  habits: { ...EMPTY_HABITS },
  dentalHistory: '',
}

/* Selectable Pill toggle component */
function SelectablePill({ label, active, onClick }) {
  return (
    <button
      type="button"
      className={`op-pill${active ? ' active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="op-pill-check">
        <Check size={10} strokeWidth={3} color="#fff" />
      </span>
      {label}
    </button>
  )
}

export default function PatientsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const notify = useNotification()
  const isDoctor = user?.role === 'doctor'

  const [patients, setPatients] = useState([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [genderFilter, setGenderFilter] = useState('')

  const handleOpenPatientConsultation = async (patient) => {
    try {
      const res = await createConsultation({ patientId: patient._id || patient.id })
      const cons = res.consultation
      navigate(`/portal/consultations/${cons._id || cons.id}`)
    } catch (err) {
      notify.error(err.message || 'Failed to open patient consultation')
    }
  }

  const [bloodGroupFilter, setBloodGroupFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)
  const [form, setForm] = useState({ ...INITIAL_FORM })
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
    setForm({ ...INITIAL_FORM, medicalHistory: { ...EMPTY_MEDICAL }, vitals: { ...EMPTY_VITALS }, habits: { ...EMPTY_HABITS } })
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
      manualAge: patient.manualAge || '',
      emergencyName: patient.emergencyContact?.name || '',
      emergencyPhone: patient.emergencyContact?.phone || '',
      bloodGroup: patient.bloodGroup || 'unknown',
      alerts: Array.isArray(patient.permanentAlerts) ? patient.permanentAlerts.join(', ') : '',
      medicalHistory: { ...EMPTY_MEDICAL, ...(patient.medicalHistory || {}) },
      currentMedications: patient.currentMedications || '',
      vitals: { ...EMPTY_VITALS, ...(patient.vitals || {}) },
      habits: { ...EMPTY_HABITS, ...(patient.habits || {}) },
      dentalHistory: patient.dentalHistory || '',
    })
    setDupWarnings([])
    setShowModal(true)
  }

  // Helper: toggle a medical history flag
  const toggleMedical = (key) => setForm((f) => ({
    ...f,
    medicalHistory: { ...f.medicalHistory, [key]: !f.medicalHistory[key] },
  }))

  // Helper: toggle a habit flag
  const toggleHabit = (key) => setForm((f) => ({
    ...f,
    habits: { ...f.habits, [key]: !f.habits[key] },
  }))

  const handleSave = async (e) => {
    e.preventDefault()
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
      manualAge: form.manualAge ? Number(form.manualAge) : null,
      emergencyContact: {
        name: form.emergencyName.trim(),
        phone: form.emergencyPhone.trim(),
      },
      bloodGroup: form.bloodGroup,
      permanentAlerts: form.alerts
        ? form.alerts.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      medicalHistory: form.medicalHistory,
      currentMedications: form.currentMedications.trim(),
      vitals: form.vitals,
      habits: form.habits,
      dentalHistory: form.dentalHistory.trim(),
    }

    try {
      if (editingPatient) {
        await updatePatient(editingPatient._id, payload)
        notify.success(`Patient details updated successfully!`)
      } else {
        await createPatient(payload)
        notify.success(`Patient registered successfully!`)
      }
      setShowModal(false)
      fetchPatients()
    } catch (err) {
      const errMsg = err.message || 'Unable to register patient. Please try again.'
      setError(errMsg)
      notify.error(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredPatients = patients.filter((p) => {
    if (genderFilter && p.gender !== genderFilter) return false
    if (bloodGroupFilter && p.bloodGroup !== bloodGroupFilter) return false
    return true
  })

  const clearPatientFilters = () => {
    setSearch('')
    setGenderFilter('')
    setBloodGroupFilter('')
    fetchPatients('')
  }

  return (
    <div className="portal-page">
      <div className="portal-heading flex justify-between items-center mb-6">
        <div>
          <h1>{isDoctor ? 'My Patients' : 'Patient Records'}</h1>
          <p>{isDoctor ? 'Assigned patient profiles, clinical history, and EMR records.' : 'Register, view, and manage patient clinical profiles.'}</p>
        </div>
        {!isDoctor && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
          >
            <Plus size={16} /> Register Patient
          </button>
        )}
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

      {/* Search & Smart Filter Bar */}
      <div className="card mb-6" style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Patient Name, Phone, or Patient ID (PAT-...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', height: '38px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
          </div>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="form-control"
            style={{ height: '38px', padding: '0 12px', minWidth: '140px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <select
            value={bloodGroupFilter}
            onChange={(e) => setBloodGroupFilter(e.target.value)}
            className="form-control"
            style={{ height: '38px', padding: '0 12px', minWidth: '150px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          >
            <option value="">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="B+">B+</option>
            <option value="O+">O+</option>
            <option value="AB+">AB+</option>
            <option value="A-">A-</option>
            <option value="B-">B-</option>
            <option value="O-">O-</option>
            <option value="AB-">AB-</option>
          </select>

          <button type="submit" className="btn btn-secondary" disabled={loading} style={{ height: '38px' }}>
            Search
          </button>

          {(search || genderFilter || bloodGroupFilter) && (
            <button type="button" className="btn btn-ghost" onClick={clearPatientFilters} style={{ height: '38px' }}>
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Patients List */}
      <div className="card">
        <div className="card-header flex justify-between items-center mb-4">
          <h2 className="card-title">Registered Patients ({filteredPatients.length})</h2>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => fetchPatients()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading && patients.length === 0 ? (
          <SkeletonTable rows={6} columns={7} />
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-8 text-muted">
            No patient records match the selected search/filters. Click "Clear" to reset filters.
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
                {filteredPatients.map((p) => (
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
                    <td style={{ padding: '10px', textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      {user?.role !== 'receptionist' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          title="Start clinical consultation & view EMR history"
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                          onClick={() => handleOpenPatientConsultation(p)}
                        >
                          <Stethoscope size={13} /> Open EMR
                        </button>
                      )}
                      {!isDoctor && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          title="Edit patient details"
                          onClick={() => openEditModal(p)}
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReusableFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSave}
        title={editingPatient ? 'Edit Patient Details' : 'Dental OP Record — New Patient'}
        subtitle={editingPatient ? 'Update patient clinical profile' : 'Register a new patient in the system'}
        submitText={editingPatient ? 'Update Patient' : 'Register Patient'}
        submitLoadingText="Saving..."
        submitting={submitting}
        maxWidth="780px"
      >
        {/* Duplicate Warnings Alert */}
        {!editingPatient && dupWarnings.length > 0 && (
          <div className="alert alert-warning mb-4" style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '8px', color: '#92400e', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, marginBottom: '4px' }}>
              <AlertTriangle size={16} /> Potential Duplicate Patient(s) Found!
            </div>
            <p style={{ margin: '4px 0', fontSize: '13px' }}>Existing patients match this phone number or name:</p>
            <ul style={{ margin: '4px 0 8px 16px', fontSize: '13px' }}>
              {dupWarnings.map((m) => (
                <li key={m._id}>
                  <strong>{m.patientId}</strong>: {m.firstName} {m.lastName} ({m.phone || 'No phone'}) - {m.city || 'No city'}
                </li>
              ))}
            </ul>
            <div style={{ fontSize: '12px', color: '#78350f' }}>Please double check to prevent creating duplicate records.</div>
          </div>
        )}

        {/* ── SECTION 1: Basic Details ── */}
        <div className="op-form-section">
          <div className="op-section-title">
            <span className="op-section-number">1</span>
            <User size={14} /> Basic Details
          </div>

          {/* OP No / Date badges — read-only */}
          {editingPatient && (
            <div className="op-readonly-row">
              <div className="op-readonly-badge">OP No: {editingPatient.patientId}</div>
              <div className="op-readonly-badge">Reg. Date: {new Date(editingPatient.createdAt).toLocaleDateString('en-IN')}</div>
            </div>
          )}

          <div className="op-field-grid">
            <div>
              <label className="op-field-label">Title</label>
              <select className="op-form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}>
                <option value="Mr">Mr</option>
                <option value="Mrs">Mrs</option>
                <option value="Ms">Ms</option>
                <option value="Master">Master</option>
                <option value="Dr">Dr</option>
              </select>
            </div>
            <div>
              <label className="op-field-label">First Name</label>
              <input type="text" className="op-form-input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="e.g. Ramesh" />
            </div>
            <div>
              <label className="op-field-label">Last Name</label>
              <input type="text" className="op-form-input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="e.g. Kumar" />
            </div>
            <div>
              <label className="op-field-label">Age</label>
              <input type="number" className="op-form-input" value={form.manualAge} onChange={(e) => setForm({ ...form, manualAge: e.target.value })} placeholder="e.g. 34" min="0" max="150" />
            </div>
            <div>
              <label className="op-field-label">Sex</label>
              <select className="op-form-input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="op-field-label">Date of Birth</label>
              <input type="date" className="op-form-input" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div>
              <label className="op-field-label">Occupation</label>
              <input type="text" className="op-form-input" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="e.g. Teacher, Engineer" />
            </div>
            <div>
              <label className="op-field-label">Phone Number</label>
              <input type="tel" className="op-form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile" />
            </div>
            <div className="op-field-full">
              <label className="op-field-label">Address</label>
              <input type="text" className="op-form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Street, area, landmark" />
            </div>
            <div>
              <label className="op-field-label">City / Town</label>
              <input type="text" className="op-form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Chennai" />
            </div>
            <div>
              <label className="op-field-label">Email</label>
              <input type="email" className="op-form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
            </div>
            <div>
              <label className="op-field-label">Blood Group</label>
              <select className="op-form-input" value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
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
              <label className="op-field-label">Emergency Contact</label>
              <input type="text" className="op-form-input" value={form.emergencyName} onChange={(e) => setForm({ ...form, emergencyName: e.target.value })} placeholder="Contact name" />
            </div>
            <div>
              <label className="op-field-label">Emergency Phone</label>
              <input type="tel" className="op-form-input" value={form.emergencyPhone} onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })} placeholder="Emergency phone" />
            </div>
          </div>
        </div>

        {/* ── SECTION 2: Medical History ── */}
        <div className="op-form-section">
          <div className="op-section-title">
            <span className="op-section-number">2</span>
            <Heart size={14} /> Medical History
          </div>
          <div className="op-pill-grid">
            {MEDICAL_CONDITIONS.map((cond) => (
              <SelectablePill
                key={cond.key}
                label={cond.label}
                active={form.medicalHistory[cond.key]}
                onClick={() => toggleMedical(cond.key)}
              />
            ))}
          </div>
          <div style={{ marginTop: '12px' }}>
            <label className="op-field-label">Any Other (specify)</label>
            <input
              type="text"
              className="op-form-input"
              value={form.medicalHistory.other}
              onChange={(e) => setForm({ ...form, medicalHistory: { ...form.medicalHistory, other: e.target.value } })}
              placeholder="e.g. Kidney disease, HIV, etc."
            />
          </div>
          <div style={{ marginTop: '10px' }}>
            <label className="op-field-label">Medical Alerts / Allergies (comma separated)</label>
            <input
              type="text"
              className="op-form-input"
              value={form.alerts}
              onChange={(e) => setForm({ ...form, alerts: e.target.value })}
              placeholder="e.g. Penicillin Allergy, Latex Allergy"
            />
          </div>
        </div>

        {/* ── SECTION 3: Current Medications ── */}
        <div className="op-form-section">
          <div className="op-section-title">
            <span className="op-section-number">3</span>
            <Pill size={14} /> Current Medications
          </div>
          <textarea
            className="op-form-textarea"
            value={form.currentMedications}
            onChange={(e) => setForm({ ...form, currentMedications: e.target.value })}
            placeholder="Enter current medications, if any"
            rows={3}
          />
        </div>

        {/* ── SECTION 4: Vitals ── */}
        <div className="op-form-section">
          <div className="op-section-title">
            <span className="op-section-number">4</span>
            <Activity size={14} /> Vitals
          </div>
          <div className="op-field-grid">
            <div>
              <label className="op-field-label">BP (Blood Pressure)</label>
              <input
                type="text"
                className="op-form-input"
                value={form.vitals.bp}
                onChange={(e) => setForm({ ...form, vitals: { ...form.vitals, bp: e.target.value } })}
                placeholder="e.g. 120/80 mmHg"
              />
            </div>
            <div>
              <label className="op-field-label">RBS (Random Blood Sugar)</label>
              <input
                type="text"
                className="op-form-input"
                value={form.vitals.rbs}
                onChange={(e) => setForm({ ...form, vitals: { ...form.vitals, rbs: e.target.value } })}
                placeholder="e.g. 110 mg/dL"
              />
            </div>
          </div>
        </div>

        {/* ── SECTION 5: Habits ── */}
        <div className="op-form-section">
          <div className="op-section-title">
            <span className="op-section-number">5</span>
            <Cigarette size={14} /> Habits
          </div>
          <div className="op-pill-grid">
            {HABIT_OPTIONS.map((h) => (
              <SelectablePill
                key={h.key}
                label={h.label}
                active={form.habits[h.key]}
                onClick={() => toggleHabit(h.key)}
              />
            ))}
          </div>
        </div>

        {/* ── SECTION 6: Dental History ── */}
        <div className="op-form-section">
          <div className="op-section-title">
            <span className="op-section-number">6</span>
            <ClipboardList size={14} /> Dental History
          </div>
          <textarea
            className="op-form-textarea"
            style={{ minHeight: '100px' }}
            value={form.dentalHistory}
            onChange={(e) => setForm({ ...form, dentalHistory: e.target.value })}
            placeholder="Previous dental treatments, ongoing complaints, chief complaint, or any other relevant dental history..."
            rows={5}
          />
        </div>
      </ReusableFormModal>
    </div>
  )
}
