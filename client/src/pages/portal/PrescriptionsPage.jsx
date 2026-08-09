import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionCard } from '../../components/ui/fields'
import {
  FREQUENCY_BY_VALUE,
  PRESCRIPTION_STATUS_BY_VALUE,
  ROUTE_BY_VALUE,
} from '../../constants/options'
import { patientPrescriptions } from '../../services/prescriptionService'
import { listPatients, getPatient } from '../../services/patientService'
import useAuth from '../../hooks/useAuth'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PrescriptionsPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const fromPatient = params.get('patient')
  const canIssue = user.role === 'doctor' || user.role === 'admin'

  const [patient, setPatient] = useState(null)
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [searching, setSearching] = useState(false)
  const [prescriptions, setPrescriptions] = useState([])
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
        const res = await patientPrescriptions(fromPatient)
        if (!cancelled) setPrescriptions(res.prescriptions || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load prescriptions.')
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
        <h1>Prescriptions</h1>
        <p>Medicines issued across OP visits, grouped per patient.</p>
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
        <SectionCard title={patientName || 'Patient prescriptions'}>
          <div className="patient-summary">
            <div className="patient-summary-meta">
              {patient ? `${patient.patientId} · ${patient.gender || '—'} · ${patient.phone || '—'}` : `Patient ${fromPatient}`}
            </div>
          </div>

          {loading ? (
            <p className="muted">Loading prescriptions…</p>
          ) : prescriptions.length === 0 ? (
            <p className="state-card">No prescriptions recorded for this patient.</p>
          ) : (
            <div className="rx-list">
              {prescriptions.map((rx) => (
                <div className="rx-card" key={rx.id}>
                  <div className="rx-card-head">
                    <div className="rx-head-main">
                      <span className="plan-number">{rx.prescriptionNumber}</span>
                      <span className="muted">
                        {fmtDate(rx.rxDate)} · {rx.medicineCount} medicine{rx.medicineCount === 1 ? '' : 's'}
                        {rx.visit?.opNumber ? ` · OP ${rx.visit.opNumber}` : ''}
                      </span>
                    </div>
                    <span className="status-badge">
                      {PRESCRIPTION_STATUS_BY_VALUE[rx.status] || rx.status}
                    </span>
                  </div>
                  {rx.notes && <p className="muted">{rx.notes}</p>}
                  <ul className="rx-items">
                    {rx.items.map((it) => (
                      <li className="rx-item" key={it.id || it._id}>
                        <div className="rx-item-main">
                          <span className="rx-item-name">
                            {it.medicine}
                            {it.genericName ? ` (${it.genericName})` : ''}
                          </span>
                          <span className="muted">
                            {[it.dosage, it.unit, FREQUENCY_BY_VALUE[it.frequency] || it.frequency].filter(Boolean).join(' · ')}
                            {it.duration !== null && it.duration !== undefined
                              ? ` · for ${it.duration} ${it.durationUnit}(s)`
                              : ''}
                            {it.route ? ` · ${ROUTE_BY_VALUE[it.route] || it.route}` : ''}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {rx.status === 'issued' && (
                    <a
                      className="btn btn-outline btn-sm"
                      href={`/portal/prescriptions/${rx.id}/print`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Print
                    </a>
                  )}
                  {canIssue && rx.status !== 'issued' && rx.status !== 'cancelled' && (
                    <a className="btn btn-outline btn-sm" href={`/portal/consultations`}>
                      Open Consultation
                    </a>
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