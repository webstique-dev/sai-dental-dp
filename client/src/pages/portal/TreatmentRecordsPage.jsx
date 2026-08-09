import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionCard } from '../../components/ui/fields'
import { TREATMENT_RECORD_STATUS_BY_VALUE } from '../../constants/options'
import { patientTreatmentRecords } from '../../services/treatmentRecordService'
import { listPatients, getPatient } from '../../services/patientService'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TreatmentRecordsPage() {
  const [params] = useSearchParams()
  const fromPatient = params.get('patient')

  const [patient, setPatient] = useState(null)
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [searching, setSearching] = useState(false)
  const [records, setRecords] = useState([])
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
        const res = await patientTreatmentRecords(fromPatient)
        if (!cancelled) setRecords(res.records || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load treatment records.')
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
    window.history.replaceState(null, '', `/portal/treatment-records?patient=${p._id || p.id}`)
  }

  const patientId = fromPatient || (patient && (patient._id || patient.id))
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : ''

  return (
    <div>
      <div className="portal-heading">
        <h1>Treatment Records</h1>
        <p>Executed clinical procedures by OP visit. Completed procedures are permanent in the tooth history.</p>
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
        <SectionCard title={patientName ? `${patientName} — Treatments` : 'Patient treatments'}>
          <div className="patient-summary">
            <div className="patient-summary-meta">
              {patient
                ? `${patient.patientId} · ${patient.gender || '—'} · ${patient.phone || '—'}`
                : `Patient ${fromPatient}`}
            </div>
          </div>

          {loading ? (
            <p className="muted">Loading treatment records…</p>
          ) : records.length === 0 ? (
            <p className="state-card">No treatment records for this patient.</p>
          ) : (
            <div className="inv-list">
              {records.map((rec) => (
                <div className="inv-card" key={rec.id}>
                  <div className="inv-card-head">
                    <div className="inv-head-main">
                      <span className="plan-number">{rec.recordNumber}</span>
                      <span className="inv-name">
                        {rec.procedure}
                        {rec.hasTooth ? ` (Tooth ${rec.toothNumber})` : ''}
                      </span>
                      <span className="muted">
                        {fmtDate(rec.procedureDate)}
                        {rec.visit?.opNumber ? ` · OP ${rec.visit.opNumber}` : ''}
                      </span>
                    </div>
                    <span className="status-badge">
                      {TREATMENT_RECORD_STATUS_BY_VALUE[rec.status] || rec.status}
                    </span>
                  </div>
                  {rec.findings && <p className="muted">Findings: {rec.findings}</p>}
                  {rec.notes && <p className="muted">Notes: {rec.notes}</p>}
                  {rec.materials.length > 0 && (
                    <p className="muted">
                      Materials:{' '}
                      {rec.materials.map((m) => `${m.name}${m.quantity ? ` × ${m.quantity}` : ''}`).join(', ')}
                    </p>
                  )}
                  {rec.completedAt && (
                    <p className="muted">
                      Completed {fmtDate(rec.completedAt)}
                      {rec.completedBy?.name ? ` by ${rec.completedBy.name}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}