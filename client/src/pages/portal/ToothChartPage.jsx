import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { SectionCard } from '../../components/ui/fields'
import ToothChartModule from '../../components/tooth/ToothChartModule'
import { listPatients, getPatient } from '../../services/patientService'
import useAuth from '../../hooks/useAuth'

export default function ToothChartPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fromPatient = params.get('patient')
  const consultationId = params.get('consultation') || undefined
  const visitId = params.get('visit') || undefined

  const canEdit = user.role === 'doctor' || user.role === 'admin'

  const [patient, setPatient] = useState(null)
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [searching, setSearching] = useState(false)
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
  }

  const patientId = fromPatient || (patient && (patient._id || patient.id))
  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : ''

  return (
    <div>
      <div className="portal-heading">
        <h1>Tooth Chart</h1>
        <p>
          Select a tooth to view its current condition, treatment history and
          add findings or treatments.
        </p>
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
        <SectionCard title={patientName || 'Patient tooth chart'}>
          <div className="patient-summary">
            {patient ? (
              <div className="patient-summary-meta">
                {patient.patientId} · {patient.gender || '—'} · {patient.phone || '—'}
              </div>
            ) : (
              <div className="patient-summary-meta">Patient {fromPatient}</div>
            )}
            {consultationId && <div className="patient-summary-meta">Linked consultation available</div>}
            <div className="tooth-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
                Back
              </button>
              {fromPatient && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate('/portal/consultations')}
                >
                  Consultations
                </button>
              )}
            </div>
          </div>

          <ToothChartModule
            patientId={patientId}
            consultationId={consultationId}
            visitId={visitId}
            readOnly={!canEdit}
          />
        </SectionCard>
      )}
    </div>
  )
}