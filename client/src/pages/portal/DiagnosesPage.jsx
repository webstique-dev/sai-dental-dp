import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionCard } from '../../components/ui/fields'
import { DIAGNOSIS_STATUS_OPTIONS } from '../../constants/options'
import { patientDiagnoses } from '../../services/diagnosisService'
import { listPatients, getPatient } from '../../services/patientService'
import useAuth from '../../hooks/useAuth'

export default function DiagnosesPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const fromPatient = params.get('patient')
  const canEdit = user.role === 'doctor' || user.role === 'admin'

  const [patient, setPatient] = useState(null)
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [searching, setSearching] = useState(false)
  const [diagnoses, setDiagnoses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await Promise.resolve()
      if (!fromPatient) return
      if (cancelled) return
      try {
        const res = await getPatient(fromPatient)
        if (!cancelled) setPatient(res.patient)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load patient.')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [fromPatient])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!fromPatient) return
      setLoading(true)
      setError('')
      try {
        const res = await patientDiagnoses(fromPatient)
        if (!cancelled) setDiagnoses(res.diagnoses || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load diagnoses.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fromPatient])

  const runSearch = async (e) => {
    e.preventDefault()
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

  const selectPatient = (p) => {
    setPatient(p)
    setPatients([])
    setSearch('')
    setParams({ patient: p._id || p.id })
  }

  const patientId = fromPatient || (patient && (patient._id || patient.id))
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : ''

  const active = diagnoses.filter((dg) => dg.status === 'active')
  const other = diagnoses.filter((dg) => dg.status !== 'active')

  return (
    <div>
      <div className="portal-heading">
        <h1>Diagnoses</h1>
        <p>Clinical diagnoses recorded for the patient across OP visits.</p>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {!patientId && (
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
                  className="patient-result-row"
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
        </SectionCard>
      )}

      {patientId && (
        <SectionCard title={patientName || 'Patient diagnoses'}>
          <div className="patient-summary">
            <div className="patient-summary-meta">
              {patient ? `${patient.patientId} · ${patient.gender || '—'} · ${patient.phone || '—'}` : `Patient ${fromPatient}`}
            </div>
            <div className="tooth-actions">
              {canEdit && (
                <a className="btn btn-outline btn-sm" href={`/portal/consultations`}>
                  Consultations
                </a>
              )}
            </div>
          </div>

          {loading ? (
            <p className="muted">Loading diagnoses…</p>
          ) : diagnoses.length === 0 ? (
            <p className="state-card">No diagnoses recorded for this patient.</p>
          ) : (
            <>
              {active.length > 0 && (
                <div className="clinical-list-group">
                  <h4 className="clinical-list-head">Active diagnoses</h4>
                  <ul className="diag-list">
                    {active.map((dg) => (
                      <li className="diag-row" key={dg.id}>
                        <div className="diag-main">
                          <span className="diag-name">{dg.name}</span>
                          <span className="muted">
                            {dg.hasTooth ? `Tooth ${dg.toothNumber}` : 'General'} · {dg.category}
                            {dg.visit?.opNumber ? ` · OP ${dg.visit.opNumber}` : ''}
                          </span>
                        </div>
                        <span className="status-badge">
                          {DIAGNOSIS_STATUS_OPTIONS.find((o) => o.value === dg.status)?.label || dg.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {other.length > 0 && (
                <div className="clinical-list-group">
                  <h4 className="clinical-list-head">Other diagnoses</h4>
                  <ul className="diag-list">
                    {other.map((dg) => (
                      <li className="diag-row" key={dg.id}>
                        <div className="diag-main">
                          <span className="diag-name">{dg.name}</span>
                          <span className="muted">
                            {dg.hasTooth ? `Tooth ${dg.toothNumber}` : 'General'} · {dg.category}
                            {dg.visit?.opNumber ? ` · OP ${dg.visit.opNumber}` : ''}
                          </span>
                        </div>
                        <span className="status-badge">
                          {DIAGNOSIS_STATUS_OPTIONS.find((o) => o.value === dg.status)?.label || dg.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </SectionCard>
      )}
    </div>
  )
}