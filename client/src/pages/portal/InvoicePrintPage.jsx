import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getInvoicePrint } from '../../services/invoiceService'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function InvoicePrintPage() {
  const { id } = useParams()
  const [inv, setInv] = useState(null)
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
        const res = await getInvoicePrint(id)
        if (!cancelled) setInv(res.invoice)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load invoice for printing.')
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
    return <div className="page-loader print-loader">Loading invoice…</div>
  }

  if (error || !inv) {
    return (
      <div className="print-page">
        <div className="state-card">
          <h2>Unable to load invoice</h2>
          <p className="muted">{error || 'Invoice not found.'}</p>
        </div>
      </div>
    )
  }

  const patient = inv.patient || {}
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
            <div className="rx-print-number">{inv.invoiceNumber}</div>
            <div className="muted">Invoice</div>
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
            <span className="rx-print-label">Billed</span>
            <b>{fmtDate(inv.billDate)}</b>
            <span className="muted">
              Status: {inv.status}{inv.finalizedAt ? ` · ${fmtDate(inv.finalizedAt)}` : ''}
            </span>
            <span className="muted">Payment: {inv.paymentStatus}</span>
          </div>
        </div>
        <table className="rx-print-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i}>
                <td>
                  <b>{it.name}</b>
                  {it.hasTooth ? <span className="muted"> (Tooth {it.toothNumber})</span> : null}
                </td>
                <td>{it.qty}</td>
                <td>{money(it.unitPrice)}</td>
                <td style={{ textAlign: 'right' }}>{money(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="rx-print-table rx-print-summary" style={{ width: '55%', marginLeft: 'auto' }}>
          <tbody>
            <tr><td>Subtotal</td><td style={{ textAlign: 'right' }}>{money(inv.subtotal)}</td></tr>
            <tr><td>Discount</td><td style={{ textAlign: 'right' }}>- {money(inv.discount)}</td></tr>
            <tr><td>Tax</td><td style={{ textAlign: 'right' }}>{money(inv.tax)}</td></tr>
            <tr style={{ fontWeight: 700 }}><td>Total</td><td style={{ textAlign: 'right' }}>{money(inv.total)}</td></tr>
            <tr><td>Paid</td><td style={{ textAlign: 'right' }}>{money(inv.amountPaid)}</td></tr>
            <tr style={{ fontWeight: 700 }}><td>Balance</td><td style={{ textAlign: 'right' }}>{money(inv.balance)}</td></tr>
          </tbody>
        </table>
        {inv.notes && (
          <div className="rx-print-notes">
            <span className="rx-print-label">Notes</span>
            <p>{inv.notes}</p>
          </div>
        )}
        <footer className="rx-print-footer">
          <span>Thank you for visiting Sai Dental.</span>
        </footer>
      </div>
    </div>
  )
}