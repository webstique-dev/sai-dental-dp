import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { SectionCard } from '../../components/ui/fields'
import {
  listPatients,
  createPatient,
} from '../../services/patientService'
import {
  createConsultation,
  patientConsultations,
} from '../../services/consultationService'
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

  const canEdit = user.role === 'doctor' || user.role === 'admin'

  const runSearch = async (e) => {
    e?.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    setError('')
    try {
      const res = await listPatients({ search: search.trim(), limit: 20 })
      setPatients(res.items)
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
      setHistory(res.items || [])
    } catch (err) {
      setError(err.message || 'Unable to load consultations')
    } finally {
      setHistoryLoading(false)
    }
  }

  const startConsultation = async () => {
    if (!selectedPatient) return
    setNotice('')
    setError('')
    try {
      const res = await createConsultation({
        patientId: selectedPatient._id || selectedPatient.id,
      })
      setNotice('Consultation created.')
      navigate(`/portal/consultations/${res.consultation.id}`)
    } catch (err) {
      setError(err.message || 'Unable to start consultation')
    }
  }

  const registerPatient = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await createPatient(newPatient)
      setNotice('Patient registered.')
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

  return (
    <div>
      <div className="portal-heading">
        <h1>Consultations</h1>
        <p>
          Search a patient, review their consultation history, and start a new
          clinical consultation.
        </p>
      </div>

      {notice && <div className="form-success">{notice}</div>}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <SectionCard title="Find a patient">
        <form className="search-row" onSubmit={runSearch}>
          <input
            className="search-input"
            type="search"
            aria-label="Search patients"
            value={search}
            placeholder="Search by name, patient ID or phone…"
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {patients.length > 0 && (
          <div className="patient-results">
            {patients.map((p) => (
              <button
                key={p._id}
                type="button"
                className={`patient-result-row${selectedPatient?._id === p._id ? ' is-selected' : ''}`}
                onClick={() => selectPatient(p)}
              >
                <span className="patient-result-name">
                  {p.firstName} {p.lastName}
                </span>
                <span className="patient-result-meta">
                  {p.patientId} · {p.gender} · {p.phone || '—'}
                </span>
              </button>
            ))}
          </div>
        )}

        {!showNewPatient ? (
          <button
            type="button"
            className="btn btn-outline btn-sm mt"
            onClick={() => setShowNewPatient(true)}
          >
            <><Plus size={12} className="mr-1" /> Register new patient</>
          </button>
        ) : (
          <form className="new-patient-grid" onSubmit={registerPatient}>
            <input
              className="search-input"
              placeholder="First name *"
              value={newPatient.firstName}
              onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
              required
            />
            <input
              className="search-input"
              placeholder="Last name *"
              value={newPatient.lastName}
              onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
              required
            />
            <input
              className="search-input"
              placeholder="Phone"
              value={newPatient.phone}
              onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
            />
            <select
              className="search-input"
              value={newPatient.gender}
              onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
            <div className="new-patient-actions">
              <button type="submit" className="btn btn-primary btn-sm">
                Register patient
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowNewPatient(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {selectedPatient && (
        <>
          <SectionCard title="Selected patient">
            <div className="patient-summary">
              <div className="patient-summary-id">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </div>
              <div className="patient-summary-meta">
                {selectedPatient.patientId} ·{' '}
                {selectedPatient.gender || '—'} · {selectedPatient.phone || '—'}
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={startConsultation}
              >
                Start new consultation
              </button>
            )}
          </SectionCard>

          <SectionCard title="Clinical history">
            {historyLoading ? (
              <p className="muted">Loading consultation history…</p>
            ) : history.length === 0 ? (
              <p className="muted">No consultations for this patient yet.</p>
            ) : (
              <div className="timeline">
                {history.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="timeline-item"
                    onClick={() => navigate(`/portal/consultations/${c.id}`)}
                  >
                    <div className="timeline-date">
                      {new Date(c.visitDate).toLocaleDateString(undefined, {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="timeline-body">
                      <div className="timeline-title">
                        {c.doctor?.name || 'Doctor'} · {c.opNumber || 'OP'}
                      </div>
                      <div className="timeline-sub">
                        <span
                          className={`status-badge status-${c.status}`}
                        >
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                        {c.completedAt && (
                          <span>Completed {new Date(c.completedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  )
}