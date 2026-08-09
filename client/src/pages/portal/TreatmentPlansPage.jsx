import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionCard } from '../../components/ui/fields'
import { PLAN_STATUS_BY_VALUE, PLAN_ITEM_STATUS_OPTIONS } from '../../constants/options'
import { patientTreatmentPlans } from '../../services/treatmentPlanService'
import { listPatients, getPatient } from '../../services/patientService'
import useAuth from '../../hooks/useAuth'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TreatmentPlansPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const fromPatient = params.get('patient')
  const canEdit = user.role === 'doctor' || user.role === 'admin'

  const [patient, setPatient] = useState(null)
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [searching, setSearching] = useState(false)
  const [plans, setPlans] = useState([])
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
        const res = await patientTreatmentPlans(fromPatient)
        if (!cancelled) setPlans(res.plans || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load treatment plans.')
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
    window.history.replaceState(null, '', `/portal/treatment-plans?patient=${p._id || p.id}`)
  }

  const patientId = fromPatient || (patient && (patient._id || patient.id))
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : ''

  return (
    <div>
      <div className="portal-heading">
        <h1>Treatment Plans</h1>
        <p>Treatment proposals and their estimated costs across OP visits.</p>
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
        <SectionCard title={patientName || 'Patient treatment plans'}>
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
            <p className="muted">Loading treatment plans…</p>
          ) : plans.length === 0 ? (
            <p className="state-card">No treatment plans recorded for this patient.</p>
          ) : (
            <div className="plan-list">
              {plans.map((plan) => (
                <div className="plan-card" key={plan.id}>
                  <div className="plan-card-head-static">
                    <div className="plan-head-main">
                      <span className="plan-number">{plan.planNumber}</span>
                      <span className="plan-name">{plan.name || 'Untitled plan'}</span>
                      <span className="muted">
                        Created {fmtDate(plan.createdAt)}
                        {plan.visit?.opNumber ? ` · OP ${plan.visit.opNumber}` : ''}
                      </span>
                    </div>
                    <div className="plan-head-meta">
                      <span className="status-badge">{PLAN_STATUS_BY_VALUE[plan.status] || plan.status}</span>
                      <span className="muted">
                        {plan.itemCount} items · ₹{plan.estimatedTotal}
                      </span>
                    </div>
                  </div>
                  {plan.declineReason && plan.status === 'declined' && (
                    <p className="muted">Declined: {plan.declineReason}</p>
                  )}
                  {plan.items.length === 0 ? (
                    <p className="state-card">No items in this plan.</p>
                  ) : (
                    <ul className="plan-item-list">
                      {plan.items.map((item) => (
                        <li className="plan-item" key={item.id}>
                          <div className="plan-item-main">
                            <span className="plan-item-proc">
                              {item.procedure}
                              {item.hasTooth ? ` (Tooth ${item.toothNumber})` : ''}
                            </span>
                            <span className="muted">
                              {item.priority} · ₹{item.estimatedCost}
                              {item.diagnosis?.name ? ` · ${item.diagnosis.name}` : ''}
                            </span>
                          </div>
                          <span className="status-badge">
                            {PLAN_ITEM_STATUS_OPTIONS.find((o) => o.value === item.status)?.label || item.status}
                          </span>
                        </li>
                      ))}
                    </ul>
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