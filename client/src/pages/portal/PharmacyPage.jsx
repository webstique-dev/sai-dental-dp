import { useEffect, useState } from 'react'
import { SectionCard } from '../../components/ui/fields'
import {
  getPharmacySummary,
  getPendingPrescriptions,
  dispensePrescription,
  listMedicines,
} from '../../services/pharmacyService'
import { PRESCRIPTION_STATUS_BY_VALUE, MEDICINE_CATEGORY_BY_VALUE, fmtDate } from '../../constants/options'

const fmtDateTime = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DispenseCard({ rx, onDone }) {
  const [medicines, setMedicines] = useState([])
  const [lines, setLines] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    listMedicines()
      .then((res) => {
        if (!cancelled) setMedicines(res.medicines || [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const setLine = (itemId, field, value) => {
    setLines((prev) => ({ ...prev, [itemId]: { ...(prev[itemId] || {}), [field]: value } }))
  }

  const remaining = (item) => {
    const prescribed = item.quantity ?? 0
    return Math.max(0, prescribed - (item.dispensedQuantity || 0))
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const items = rx.items
        .map((it) => {
          const line = lines[it.id] || {}
          const medicineId = line.medicineId
          const quantity = Number(line.quantity)
          if (!medicineId || !Number.isFinite(quantity) || quantity <= 0) return null
          return { itemId: it.id, medicineId, quantity }
        })
        .filter(Boolean)
      if (items.length === 0) {
        setError('Choose an inventory medicine and a quantity for at least one line.')
        setBusy(false)
        return
      }
      await dispensePrescription(rx.id, { items })
      setLines({})
      await onDone()
    } catch (err) {
      setError(err.message || 'Unable to dispense.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="rx-card" onSubmit={submit}>
      <div className="rx-card-head">
        <div className="rx-head-main">
          <span className="plan-number">{rx.prescriptionNumber}</span>
          <span className="muted">
            {rx.patient?.firstName} {rx.patient?.lastName} · {fmtDate(rx.rxDate)}
            {rx.visit?.opNumber ? ` · OP ${rx.visit.opNumber}` : ''}
          </span>
        </div>
        <span className="status-badge">{PRESCRIPTION_STATUS_BY_VALUE[rx.status] || rx.status}</span>
      </div>
      {rx.items.map((it) => {
        const prescribed = it.quantity ?? null
        const left = remaining(it)
        return (
          <div className="rx-item dispense-line" key={it.id}>
            <div className="rx-item-main">
              <span className="rx-item-name">
                {it.medicine}
                {it.genericName ? ` (${it.genericName})` : ''}
              </span>
              <span className="muted">
                {[it.dosage, it.unit].filter(Boolean).join(' ')}
                {prescribed !== null ? ` · prescribe ${prescribed}` : ''}
                {it.dispensedQuantity > 0 ? ` · dispensed ${it.dispensedQuantity}` : ''}
                {it.dispensedQuantity > 0 ? ` · left ${left}` : ''}
              </span>
            </div>
            <div className="dispense-controls">
              <select
                value={(lines[it.id] && lines[it.id].medicineId) || ''}
                onChange={(e) => setLine(it.id, 'medicineId', e.target.value)}
              >
                <option value="">Pick inventory medicine…</option>
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · stock {m.quantity} · {MEDICINE_CATEGORY_BY_VALUE[m.category] || m.category}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                placeholder="Qty"
                value={(lines[it.id] && lines[it.id].quantity) || ''}
                onChange={(e) => setLine(it.id, 'quantity', e.target.value)}
              />
            </div>
          </div>
        )
      })}
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? 'Dispensing…' : 'Dispense'}
        </button>
      </div>
    </form>
  )
}

export default function PharmacyPage() {
  const [summary, setSummary] = useState(null)
  const [pending, setPending] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const [sum, pend] = await Promise.all([getPharmacySummary(), getPendingPrescriptions()])
        if (!cancelled) {
          setSummary(sum.summary)
          setPending(pend.prescriptions || [])
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load pharmacy dashboard.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = async () => {
    try {
      const [sum, pend] = await Promise.all([getPharmacySummary(), getPendingPrescriptions()])
      setSummary(sum.summary)
      setPending(pend.prescriptions || [])
    } catch (err) {
      setError(err.message || 'Unable to refresh pharmacy dashboard.')
    }
  }

  return (
    <div>
      <div className="portal-heading">
        <h1>Pharmacy</h1>
        <p>Dispense issued prescriptions and monitor stock in real time.</p>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {loading && !summary ? (
        <p className="muted">Loading pharmacy dashboard…</p>
      ) : (
        summary && (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-value">{summary.pending}</span>
                <span className="stat-label">Pending prescriptions</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{summary.dispensedToday}</span>
                <span className="stat-label">Dispensed today</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{summary.lowStockCount}</span>
                <span className="stat-label">Low stock</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{summary.outOfStockCount}</span>
                <span className="stat-label">Out of stock</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{summary.expiringSoonCount}</span>
                <span className="stat-label">Expiring soon</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{summary.expiredCount}</span>
                <span className="stat-label">Expired</span>
              </div>
            </div>

            <SectionCard title="Dispense queue">
              {pending.length === 0 ? (
                <p className="state-card">No prescriptions waiting to be dispensed.</p>
              ) : (
                <div className="rx-list">
                  {pending.map((rx) => (
                    <DispenseCard key={rx.id} rx={rx} onDone={refresh} />
                  ))}
                </div>
              )}
            </SectionCard>

            {(summary.expiringSoon.length > 0 || summary.expired.length > 0) && (
              <SectionCard title="Expiry alerts">
                <div className="inventory-list">
                  {[...summary.expiringSoon, ...summary.expired].map((m) => (
                    <div className="inventory-row" key={`${m.expired ? 'ex' : 'es'}-${m.id}`}>
                      <span className="inv-name">{m.name}</span>
                      <span className="muted">
                        {m.expired ? 'Expired' : 'Expiring'} · {fmtDate(m.expiryDate)} · qty {m.quantity}
                      </span>
                      <span className="status-badge status-cancelled">{m.expired ? 'Expired' : 'Expiring soon'}</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {summary.recentDispenses.length > 0 && (
              <SectionCard title="Recent dispensing">
                <div className="inventory-list">
                  {summary.recentDispenses.map((t) => (
                    <div className="inventory-row" key={t.id}>
                      <span className="inv-name">{t.medicine?.name || 'Medicine'}</span>
                      <span className="muted">
                        {Math.abs(t.quantityChange)} units · {fmtDateTime(t.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </>
        )
      )}
    </div>
  )
}