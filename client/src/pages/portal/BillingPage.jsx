import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { SectionCard, Field } from '../../components/ui/fields'
import {
  INVOICE_STATUS_BY_VALUE,
  INVOICE_PAYMENT_STATUS_BY_VALUE,
  PAYMENT_METHOD_OPTIONS,
  DISCOUNT_TYPE_OPTIONS,
  DISCOUNT_TYPE_BY_VALUE,
  SERVICE_CATEGORY_BY_VALUE,
  formatRupees,
} from '../../constants/options'
import {
  createInvoice,
  updateInvoice,
  addInvoiceItem,
  removeInvoiceItem,
  finalizeInvoice,
  cancelInvoice,
  recordPayment,
  recordRefund,
  invoicePayments,
  patientInvoices,
} from '../../services/invoiceService'
import { listServices } from '../../services/serviceService'
import { listPatients, getPatient } from '../../services/patientService'
import { patientTreatmentRecords } from '../../services/treatmentRecordService'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function LineEditor({ services, onAdd, onClose, onFromTreatment, treatments }) {
  const [serviceId, setServiceId] = useState('')
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [qty, setQty] = useState(1)
  const [toothNumber, setToothNumber] = useState('')
  const [mode, setMode] = useState('service')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [selectedTr, setSelectedTr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'treatment') {
        if (!selectedTr) throw new Error('Select a completed treatment to bill.')
        await onAdd({ treatmentRecordId: selectedTr, qty })
      } else if (serviceId) {
        await onAdd({ serviceId, qty, toothNumber: toothNumber || undefined, hasTooth: Boolean(toothNumber) })
      } else if (customName.trim()) {
        await onAdd({ name: customName.trim(), unitPrice: Number(customPrice), qty })
      } else {
        throw new Error('Choose a service, a completed treatment, or enter a custom line.')
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Unable to add line.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="inv-form" onSubmit={submit}>
      <div className="billing-line-head">
        <div className="choice-strip">
          <button
            type="button"
            className={`choice-pill${mode === 'service' ? ' is-selected' : ''}`}
            onClick={() => setMode('service')}
          >
            Service
          </button>
          <button
            type="button"
            className={`choice-pill${mode === 'treatment' ? ' is-selected' : ''}`}
            onClick={() => setMode('treatment')}
          >
            Completed treatment
          </button>
          <button
            type="button"
            className={`choice-pill${mode === 'custom' ? ' is-selected' : ''}`}
            onClick={() => setMode('custom')}
          >
            Custom
          </button>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {mode === 'service' && (
        <Field label="Service">
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
            <option value="">Select a service…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatRupees(s.unitPrice)}
                {s.category ? ` (${SERVICE_CATEGORY_BY_VALUE[s.category] || s.category})` : ''}
              </option>
            ))}
          </select>
        </Field>
      )}

      {mode === 'treatment' && (
        <Field label="Completed treatment">
          <select value={selectedTr} onChange={(e) => setSelectedTr(e.target.value)}>
            <option value="">Select a completed treatment…</option>
            {treatments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.procedure}
                {t.hasTooth ? ` (Tooth ${t.toothNumber})` : ''} — {fmtDate(t.procedureDate)}
              </option>
            ))}
          </select>
        </Field>
      )}

      {mode === 'custom' && (
        <div className="form-grid">
          <Field label="Line name">
            <input value={customName} placeholder="e.g. Consultation" onChange={(e) => setCustomName(e.target.value)} />
          </Field>
          <Field label="Unit price (₹)">
            <input type="number" min="0" step="0.01" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} />
          </Field>
        </div>
      )}

      <div className="form-grid">
        <Field label="Quantity">
          <input type="number" min="1" value={qty} onChange={(e) => setQty(Number(e.target.value) || 1)} />
        </Field>
        <Field label="Tooth (optional)">
          <input type="number" min="1" max="48" value={toothNumber} onChange={(e) => setToothNumber(e.target.value)} />
        </Field>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Adding…' : 'Add line'}
        </button>
      </div>
      {onFromTreatment && (
        <p className="muted small-muted">Tip: billing a completed treatment snapshots the catalog price for that procedure.</p>
      )}
    </form>
  )
}

function PaymentForm({ invoice, onRecorded }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('cash')
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (!amount || Number(amount) <= 0) throw new Error('Enter a valid payment amount.')
      await recordPayment(invoice.id, { amount: Number(amount), method, reference })
      setAmount('')
      setReference('')
      onRecorded()
    } catch (err) {
      setError(err.message || 'Unable to record payment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="inv-form" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Amount (₹)">
          <input type="number" min="0.01" step="0.01" value={amount} placeholder={`Balance ${formatRupees(invoice.balance)}`} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Method">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Reference (UPI txn id / cheque no — optional)">
        <input value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || invoice.balance <= 0}>
          {busy ? 'Saving…' : 'Record payment'}
        </button>
      </div>
    </form>
  )
}

function RefundForm({ invoice, onRecorded }) {
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (!amount || Number(amount) <= 0) throw new Error('Enter a valid refund amount.')
      await recordRefund(invoice.id, { amount: Number(amount), method: 'cash' })
      setAmount('')
      onRecorded()
    } catch (err) {
      setError(err.message || 'Unable to record refund.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="inv-form" onSubmit={submit}>
      <Field label="Refund amount (₹)">
        <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn-outline" disabled={busy || invoice.amountPaid <= 0}>
          {busy ? 'Processing…' : 'Refund'}
        </button>
      </div>
    </form>
  )
}

function InvoiceCard({ invoice, services, treatments, onChanged }) {
  const [adding, setAdding] = useState(false)
  const [paying, setPaying] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [discountType, setDiscountType] = useState(invoice.discountType || 'none')
  const [discountValue, setDiscountValue] = useState(invoice.discountValue || '')
  const [taxPercent, setTaxPercent] = useState(invoice.taxPercent || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)

  const canEdit = invoice.status === 'draft'
  const canPay = invoice.status === 'finalized' && invoice.balance > 0
  const canRefund = invoice.status === 'finalized' && invoice.amountPaid > 0

  const refresh = () => {
    setPaying(false)
    setRefunding(false)
    setAdding(false)
    onChanged()
  }

  const saveDiscount = async () => {
    setBusy(true)
    setError('')
    try {
      await updateInvoice(invoice.id, {
        discountType,
        discountValue: discountType === 'none' ? 0 : Number(discountValue) || 0,
        taxPercent: Number(taxPercent) || 0,
      })
      refresh()
    } catch (err) {
      setError(err.message || 'Unable to update invoice totals.')
    } finally {
      setBusy(false)
    }
  }

  const finalize = async () => {
    setBusy(true)
    setError('')
    try {
      await finalizeInvoice(invoice.id)
      refresh()
    } catch (err) {
      setError(err.message || 'Unable to finalize invoice.')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!window.confirm(`Cancel invoice ${invoice.invoiceNumber}?`)) return
    setBusy(true)
    setError('')
    try {
      const reason = window.prompt('Reason for cancellation (optional)') || ''
      await cancelInvoice(invoice.id, reason)
      refresh()
    } catch (err) {
      setError(err.message || 'Unable to cancel invoice.')
    } finally {
      setBusy(false)
    }
  }

  const removeItem = async (itemId) => {
    setBusy(true)
    setError('')
    try {
      await removeInvoiceItem(invoice.id, itemId)
      refresh()
    } catch (err) {
      setError(err.message || 'Unable to remove line.')
    } finally {
      setBusy(false)
    }
  }

  const statusClass = `status-${invoice.status === 'finalized' ? 'completed' : invoice.status === 'cancelled' ? 'cancelled' : 'draft'}`

  return (
    <div className="inv-card billing-invoice">
      <div className="inv-card-head">
        <div className="inv-head-main">
          <span className="plan-number">{invoice.invoiceNumber}</span>
          <span className="inv-name">Bill dated {fmtDate(invoice.billDate)}</span>
          {invoice.visit?.opNumber && <span className="muted">OP {invoice.visit.opNumber}</span>}
        </div>
        <div className="billing-head-right">
          <span className={`status-badge ${statusClass}`}>{INVOICE_STATUS_BY_VALUE[invoice.status] || invoice.status}</span>
          <span className="status-badge">{INVOICE_PAYMENT_STATUS_BY_VALUE[invoice.paymentStatus] || invoice.paymentStatus}</span>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <table className="billing-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it) => (
            <tr key={it.id}>
              <td>
                {it.name}
                {it.hasTooth ? <span className="muted"> (Tooth {it.toothNumber})</span> : null}
                {it.treatmentRecordId ? <span className="muted bill-tag">treatment</span> : null}
              </td>
              <td>{it.qty}</td>
              <td>{formatRupees(it.unitPrice)}</td>
              <td>{formatRupees(it.lineTotal)}</td>
              <td>
                {canEdit && (
                  <button type="button" className="btn-icon" title="Remove" onClick={() => removeItem(it.id)}>
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="billing-totals">
        <div>
          <span>Subtotal</span>
          <b>{formatRupees(invoice.subtotal)}</b>
        </div>
        <div>
          <span>Discount</span>
          <b>- {formatRupees(invoice.discount)}</b>
        </div>
        {invoice.tax > 0 && (
          <div>
            <span>Tax</span>
            <b>{formatRupees(invoice.tax)}</b>
          </div>
        )}
        <div className="billing-grand">
          <span>Total</span>
          <b>{formatRupees(invoice.total)}</b>
        </div>
        <div>
          <span>Paid</span>
          <b>{formatRupees(invoice.amountPaid)}</b>
        </div>
        <div className={invoice.balance > 0 ? 'billing-balance-owed' : ''}>
          <span>Balance</span>
          <b>{formatRupees(invoice.balance)}</b>
        </div>
      </div>

      {invoice.payments && invoice.payments.length > 0 && (
        <div className="billing-payments">
          <p className="billing-subhead">Payments</p>
          {invoice.payments.map((p) => (
            <div key={p.id} className="billing-payment-row">
              <span>{p.type === 'refund' ? 'Refund' : 'Payment'} {p.paymentNumber}</span>
              <span className="muted">{fmtDateTime(p.paymentDate)} · {p.method}</span>
              <span className={p.type === 'refund' ? 'billing-refund-amt' : ''}>
                {p.type === 'refund' ? '-' : ''}
                {formatRupees(p.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="billing-actions">
        {canEdit && (
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Close' : '+ Add line'}
          </button>
        )}
        {canEdit && (
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setDetailsOpen((v) => !v)}>
            {detailsOpen ? 'Hide totals' : 'Discount / Tax'}
          </button>
        )}
        {canEdit && (
          <button type="button" className="btn btn-sm btn-primary" disabled={busy || invoice.items.length === 0} onClick={finalize}>
            Finalize
          </button>
        )}
        {canPay && (
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setPaying((v) => !v)}>
            {paying ? 'Close' : 'Record payment'}
          </button>
        )}
        {canRefund && (
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setRefunding((v) => !v)}>
            {refunding ? 'Close' : 'Refund'}
          </button>
        )}
        {canEdit && (
          <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={cancel}>
            Cancel
          </button>
        )}
        <Link to={`/portal/billing/${invoice.id}/print`} className="btn btn-sm btn-secondary">
          Print
        </Link>
      </div>

      {adding && (
        <LineEditor
          services={services}
          treatments={treatments}
          onClose={() => setAdding(false)}
          onAdd={async (payload) => {
            await addInvoiceItem(invoice.id, payload)
            refresh()
          }}
        />
      )}

      {detailsOpen && canEdit && (
        <form
          className="inv-form"
          onSubmit={(e) => {
            e.preventDefault()
            saveDiscount()
          }}
        >
          <div className="form-grid">
            <Field label="Discount type">
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                {DISCOUNT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            {discountType !== 'none' && (
              <Field label={discountType === 'percent' ? 'Discount %' : 'Discount (₹)'}>
                <input type="number" min="0" step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
              </Field>
            )}
            <Field label="Tax %">
              <input type="number" min="0" max="100" step="0.01" value={taxPercent} onChange={(e) => setTaxPercent(e.target.value)} />
            </Field>
          </div>
          {discountType !== 'none' && (
            <p className="muted small-muted">
              Current: {DISCOUNT_TYPE_BY_VALUE[discountType]} {discountType === 'percent' ? `${discountValue}%` : formatRupees(discountValue)} → {formatRupees(invoice.discount)} discount
            </p>
          )}
          <div className="form-actions">
            <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
              Save totals
            </button>
          </div>
        </form>
      )}

      {paying && <PaymentForm invoice={invoice} onRecorded={refresh} />}
      {refunding && <RefundForm invoice={invoice} onRecorded={refresh} />}
    </div>
  )
}

export default function BillingPage() {
  const [params, setParams] = useSearchParams()
  const fromPatient = params.get('patient')

  const [patient, setPatient] = useState(null)
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [searching, setSearching] = useState(false)
  const [invoices, setInvoices] = useState([])
  const [services, setServices] = useState([])
  const [treatments, setTreatments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createBusy, setCreateBusy] = useState(false)

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
      setLoading(true)
      setError('')
      try {
        const [invRes, svcRes] = await Promise.all([
          patientInvoices(fromPatient),
          listServices({ activeOnly: true }),
        ])
        if (cancelled) return
        setInvoices(invRes.invoices || [])
        setServices(svcRes.services || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load billing.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (fromPatient) {
      load()
    }
    return () => {
      cancelled = true
    }
  }, [fromPatient])

  useEffect(() => {
    let cancelled = false
    const loadTreatments = async () => {
      if (!fromPatient) return
try {
          const res = await patientTreatmentRecords(fromPatient)
          if (!cancelled) {
            setTreatments((res.records || []).filter((r) => r.status === 'completed'))
          }
        } catch {
          if (!cancelled) setTreatments([])
        }
    }
    loadTreatments()
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

  const invoicePaymentsFor = async (inv) => {
    try {
      const pr = await invoicePayments(inv)
      return pr.payments || []
    } catch {
      return []
    }
  }

  const reloadInvoices = async () => {
    try {
      const res = await patientInvoices(fromPatient)
      const invList = res.invoices || []
      const withPayments = await Promise.all(
        invList.map(async (inv) => {
          const payments = await invoicePaymentsFor(inv.id)
          return { ...inv, payments }
        }),
      )
      setInvoices(withPayments)
    } catch (err) {
      setError(err.message || 'Unable to reload billing.')
    }
  }

  const createNew = async () => {
    setCreateBusy(true)
    setError('')
    try {
      const starter = services[0]
      const items = starter ? [{ serviceId: starter.id, qty: 1 }] : []
      await createInvoice({ patientId, items })
      setCreating(false)
      await reloadInvoices()
    } catch (err) {
      setError(err.message || 'Unable to create invoice.')
    } finally {
      setCreateBusy(false)
    }
  }

  return (
    <div>
      <div className="portal-heading">
        <h1>Billing</h1>
        <p>Create invoices, snap catalog prices, record payments and track balances.</p>
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
        <SectionCard title={patientName ? `${patientName} — Billing` : 'Patient billing'}>
          <div className="patient-summary">
            <div className="patient-summary-meta">
              {patient
                ? `${patient.patientId} · ${patient.gender || '—'} · ${patient.phone || '—'}`
                : `Patient ${fromPatient}`}
            </div>
          </div>

          <div className="billing-toolbar">
            <button type="button" className="btn btn-primary" onClick={createNew} disabled={createBusy}>
              {createBusy ? 'Creating…' : 'New invoice'}
            </button>
            {creating && (
              <button type="button" className="btn btn-outline" onClick={() => setCreating(false)}>
                Cancel
              </button>
            )}
            <Link to={`/portal/payments?patient=${patientId}`} className="btn btn-secondary">
              View payments
            </Link>
          </div>

          {loading ? (
            <p className="muted">Loading billing…</p>
          ) : invoices.length === 0 ? (
            <p className="state-card">No invoices for this patient. Create one to begin.</p>
          ) : (
            <div className="inv-list">
              {invoices.map((inv) => (
                <InvoiceCard
                  key={inv.id}
                  invoice={inv}
                  services={services}
                  treatments={treatments}
                  onChanged={reloadInvoices}
                />
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}