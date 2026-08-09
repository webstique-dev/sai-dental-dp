import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  FREQUENCY_BY_VALUE,
  FOOD_INSTRUCTION_BY_VALUE,
  ROUTE_BY_VALUE,
} from '../../constants/options'
import { getPrescriptionPrint } from '../../services/prescriptionService'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PrescriptionPrintPage() {
  const { id } = useParams()
  const [rx, setRx] = useState(null)
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
        const res = await getPrescriptionPrint(id)
        if (!cancelled) setRx(res.prescription)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load prescription for printing.')
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
    return <div className="page-loader print-loader">Loading prescription…</div>
  }

  if (error || !rx) {
    return (
      <div className="print-page">
        <div className="state-card">
          <h2>Unable to load prescription</h2>
          <p className="muted">{error || 'Prescription not found.'}</p>
        </div>
      </div>
    )
  }

  const patient = rx.patient || {}

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
          <div className="rx-print-number">{rx.prescriptionNumber}</div>
        </header>
        <div className="rx-print-meta">
          <div className="rx-print-meta-col">
            <span className="rx-print-label">Patient</span>
            <b>
              {patient.firstName} {patient.lastName}
            </b>
            <span className="muted">{patient.patientId || ''}</span>
            <span className="muted">{patient.gender}${
              patient.dob ? ` · Dob ${fmtDate(patient.dob)}` : ''
            }</span>
            <span className="muted">{patient.phone || ''}</span>
          </div>
          <div className="rx-print-meta-col">
            <span className="rx-print-label">Doctor</span>
            <b>{rx.doctor?.name || '—'}</b>
            <span className="muted">Prescribed {fmtDate(rx.rxDate)}</span>
            {rx.issuedAt && <span className="muted">Issued {fmtDate(rx.issuedAt)}</span>}
          </div>
        </div>
        <table className="rx-print-table">
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Dosage</th>
              <th>Frequency</th>
              <th>Duration</th>
              <th>Route</th>
              <th>Food</th>
            </tr>
          </thead>
          <tbody>
            {rx.items.map((it, i) => (
              <tr key={i}>
                <td>
                  <b>{it.medicine}</b>
                  {it.genericName ? <span className="muted">{it.genericName}</span> : null}
                  {it.instructions ? <div className="rx-print-instructions">{it.instructions}</div> : null}
                </td>
                <td>
                  {[it.dosage, it.unit].filter(Boolean).join(' ')}
                </td>
                <td>{FREQUENCY_BY_VALUE[it.frequency] || it.frequency}</td>
                <td>
                  {it.duration !== null && it.duration !== undefined
                    ? `${it.duration} ${it.durationUnit}(s)`
                    : '—'}
                </td>
                <td>{ROUTE_BY_VALUE[it.route] || it.route}</td>
                <td>{FOOD_INSTRUCTION_BY_VALUE[it.foodInstruction] || it.foodInstruction}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rx.notes && (
          <div className="rx-print-notes">
            <span className="rx-print-label">Notes</span>
            <p>{rx.notes}</p>
          </div>
        )}
        <footer className="rx-print-footer">
          <span>Thank you — follow the prescribed course as directed.</span>
        </footer>
      </div>
    </div>
  )
}