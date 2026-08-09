import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPaymentReceipt } from '../../services/paymentService'

const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function ReceiptPrintPage() {
  const { id } = useParams()
  const [rec, setRec] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError('')
      try {
        const res = await getPaymentReceipt(id)
        if (!cancelled) setRec(res.receipt)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load receipt.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <div className="page-loader print-loader">Loading receipt…</div>
  }

  if (error || !rec) {
    return (
      <div className="print-page">
        <div className="state-card">
          <h2>Unable to load receipt</h2>
          <p className="muted">{error || 'Receipt not found.'}</p>
        </div>
      </div>
    )
  }

  const patient = rec.patient || {}
  const money = (v) =>
    `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <button className="btn btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <div className="rx-print-sheet">
        <header className="rx-print-header">
          <div className="rx-print-brand">Sai Dental</div>
          <div>
            <div className="rx-print-number">{rec.paymentNumber}</div>
            <div className="muted">Payment Receipt</div>
          </div>
        </header>
        <div className="rx-print-meta">
          <div className="rx-print-meta-col">
            <span className="rx-print-label">Patient</span>
            <b>
              {patient.firstName} {patient.lastName}
            </b>
            <span className="muted">{patient.patientId || ''}</span>
            <span className="muted">{patient.phone || ''}</span>
          </div>
          <div className="rx-print-meta-col">
            <span className="rx-print-label">Payment</span>
            <b>{money(rec.amount)}</b>
            <span className="muted">Recorded {fmtDateTime(rec.paymentDate)}</span>
            <span className="muted">Method: {rec.method}</span>
          </div>
        </div>
        {rec.invoice && (
          <p>
            <span className="rx-print-label">Invoice</span>{' '}
            <b>{rec.invoice.invoiceNumber || rec.invoice || ''}</b>
            {rec.invoice.total !== undefined && <span className="muted"> · Total {money(rec.invoice.total)}</span>}
          </p>
        )}
        {rec.reference && (
          <p>
            <span className="rx-print-label">Reference</span> {rec.reference}
          </p>
        )}
        {rec.notes && (
          <div className="rx-print-notes">
            <span className="rx-print-label">Notes</span>
            <p>{rec.notes}</p>
          </div>
        )}
        <footer className="rx-print-footer">
          <span>Money received. Thank you — Sai Dental.</span>
        </footer>
      </div>
    </div>
  )
}