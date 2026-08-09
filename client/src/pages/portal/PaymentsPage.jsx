import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { SectionCard } from '../../components/ui/fields'
import { listPatients, getPatient } from '../../services/patientService'
import { listPayments } from '../../services/paymentService'
import { PAYMENT_METHOD_BY_VALUE, PAYMENT_TYPE_BY_VALUE, formatRupees } from '../../constants/options'


const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function PaymentsPage() {
  const [params, setParams] = useSearchParams()
  const fromPatient = params.get('patient')

  const [patient, setPatient] = useState(null)
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [searching, setSearching] = useState(false)
  const [payments, setPayments] = useState([])
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
        const res = await listPayments({ patientId: fromPatient, limit: 200 })
        if (!cancelled) setPayments(res.payments || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load payments.')
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
  const totalPaid = payments.filter((p) => p.type !== 'refund').reduce((s, p) => s + p.amount, 0)
  const totalRefunded = payments.filter((p) => p.type === 'refund').reduce((s, p) => s + p.amount, 0)

  return (
    <div>
      <div className="portal-heading">
        <h1>Payments</h1>
        <p>Recorded payments and refunds with receipt numbers, methods and balances.</p>
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
        <SectionCard title={patientName ? `${patientName} — Payments` : 'Patient payments'}>
          <div className="patient-summary">
            <div className="patient-summary-meta">
              {patient
                ? `${patient.patientId} · ${patient.gender || '—'} · ${patient.phone || '—'}`
                : `Patient ${fromPatient}`}
            </div>
          </div>

          {(totalPaid > 0 || totalRefunded > 0) && (
            <div className="billing-summary-chips">
              <span className="alert-chip">
                Received {formatRupees(totalPaid)}
              </span>
              {totalRefunded > 0 && <span className="alert-chip chip-danger">Refunded {formatRupees(totalRefunded)}</span>}
            </div>
          )}

          {loading ? (
            <p className="muted">Loading payments…</p>
          ) : payments.length === 0 ? (
            <p className="state-card">No payments recorded for this patient.</p>
          ) : (
            <div className="inv-list">
              {payments.map((p) => (
                <div className="inv-card" key={p.id}>
                  <div className="inv-card-head">
                    <div className="inv-head-main">
                      <span className="plan-number">{p.paymentNumber}</span>
                      <span className="inv-name">
                        {PAYMENT_TYPE_BY_VALUE[p.type] || p.type} — {fmtDateTime(p.paymentDate)}
                      </span>
                      <span className="muted">Method: {PAYMENT_METHOD_BY_VALUE[p.method] || p.method}</span>
                    </div>
                    <div className="billing-head-right">
                      <span className={p.type === 'refund' ? 'billing-refund-amt' : ''}>
                        {p.type === 'refund' ? '-' : '+'}
                        {formatRupees(p.amount)}
                      </span>
                      <Link to={`/portal/payments/${p.id}/receipt`} className="btn btn-sm btn-secondary">
                        Receipt
                      </Link>
                    </div>
                  </div>
                  {p.reference && <p className="muted">Reference: {p.reference}</p>}
                  {p.invoice && <p className="muted">Invoice: {p.invoice.invoiceNumber || p.invoice || ''}</p>}
                  {p.notes && <p className="muted">Notes: {p.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}