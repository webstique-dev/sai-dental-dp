import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionCard } from '../../components/ui/fields'
import {
  INVESTIGATION_PRIORITY_BY_VALUE,
  INVESTIGATION_STATUS_BY_VALUE,
  INVESTIGATION_TYPE_BY_VALUE,
} from '../../constants/options'
import { patientInvestigations } from '../../services/investigationService'
import { listPatients, getPatient } from '../../services/patientService'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function InvestigationsPage() {
  const [params, setParams] = useSearchParams()
  const fromPatient = params.get('patient')

  const [patient, setPatient] = useState(null)
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [searching, setSearching] = useState(false)
  const [investigations, setInvestigations] = useState([])
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
        const res = await patientInvestigations(fromPatient)
        if (!cancelled) setInvestigations(res.investigations || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load investigations.')
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

  return (
    <div>
      <div className="portal-heading">
        <h1>Investigations</h1>
        <p>Radiographic and laboratory requests across OP visits.</p>
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
        <SectionCard title={patientName || 'Patient investigations'}>
          <div className="patient-summary">
            <div className="patient-summary-meta">
              {patient ? `${patient.patientId} · ${patient.gender || '—'} · ${patient.phone || '—'}` : `Patient ${fromPatient}`}
            </div>
          </div>

          {loading ? (
            <p className="muted">Loading investigations…</p>
          ) : investigations.length === 0 ? (
            <p className="state-card">No investigations recorded for this patient.</p>
          ) : (
            <div className="inv-list">
              {investigations.map((inv) => (
                <div className="inv-card" key={inv.id}>
                  <div className="inv-card-head">
                    <div className="inv-head-main">
                      <span className="plan-number">{inv.investigationNumber}</span>
                      <span className="inv-name">
                        {INVESTIGATION_TYPE_BY_VALUE[inv.type] || inv.typeLabel || inv.type}
                      </span>
                      <span className="muted">
                        {fmtDate(inv.requestedDate)} · {INVESTIGATION_PRIORITY_BY_VALUE[inv.priority] || inv.priority}
                        {inv.visit?.opNumber ? ` · OP ${inv.visit.opNumber}` : ''}
                      </span>
                    </div>
                    <span className="status-badge">
                      {INVESTIGATION_STATUS_BY_VALUE[inv.status] || inv.status}
                    </span>
                  </div>
                  {inv.reason && <p className="muted">Reason: {inv.reason}</p>}
                  {inv.result && (
                    <div className="inv-result">
                      <div className="inv-result-head">
                        <span className="inv-result-label">Result</span>
                        <span className="muted">{fmtDate(inv.result.resultDate)}</span>
                      </div>
                      {inv.result.findings && <p>Findings: {inv.result.findings}</p>}
                      {inv.result.interpretation && <p>Interpretation: {inv.result.interpretation}</p>}
                    </div>
                  )}
                  {inv.resultHistory.length > 0 && (
                    <details className="inv-history">
                      <summary>Previous results ({inv.resultHistory.length})</summary>
                      {inv.resultHistory.map((h, i) => (
                        <div className="inv-result inv-result-history" key={i}>
                          <p>Findings: {h.findings}</p>
                          {h.interpretation && <p>Interpretation: {h.interpretation}</p>}
                          <p className="muted">{fmtDate(h.resultDate)}</p>
                        </div>
                      ))}
                    </details>
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