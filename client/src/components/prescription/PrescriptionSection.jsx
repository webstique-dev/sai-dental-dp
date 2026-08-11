import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { SectionCard, TextField } from '../ui/fields'
import ConfirmationDialog from '../common/ConfirmationDialog'
import {
  DOSAGE_UNIT_OPTIONS,
  DURATION_UNIT_OPTIONS,
  FOOD_INSTRUCTION_OPTIONS,
  FREQUENCY_BY_VALUE,
  FREQUENCY_OPTIONS,
  MEDICINE_LIBRARY,
  PRESCRIPTION_STATUS_BY_VALUE,
  ROUTE_BY_VALUE,
  ROUTE_OPTIONS,
} from '../../constants/options'
import {
  consultationPrescriptions,
  createPrescription,
  issuePrescription,
  updatePrescription,
} from '../../services/prescriptionService'

const LOCKED_STATUSES = ['issued', 'partially-dispensed', 'dispensed', 'cancelled']

const emptyItem = () => ({
  medicine: '',
  genericName: '',
  dosage: '',
  unit: 'mg',
  frequency: 'twice-daily',
  customFrequency: '',
  duration: '',
  durationUnit: 'day',
  route: 'oral',
  quantity: '',
  foodInstruction: 'after-food',
  instructions: '',
  notes: '',
})

export default function PrescriptionSection({ patientId, consultationId, visitId, readOnly = false }) {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ notes: '', items: [emptyItem()] })
  const [confirmRx, setConfirmRx] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const load = async () => {
    if (!consultationId) return
    await Promise.resolve()
    setLoading(true)
    setError('')
    try {
      const res = await consultationPrescriptions(consultationId)
      setPrescriptions(res.prescriptions || [])
    } catch (err) {
      setError(err.message || 'Unable to load prescriptions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError('')
      try {
        const res = await consultationPrescriptions(consultationId)
        if (!cancelled) setPrescriptions(res.prescriptions || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load prescriptions.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [consultationId])

  const setItem = (i, patch) =>
    setForm((f) => {
      const items = f.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it))
      return { ...f, items }
    })

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))
  const removeItem = (i) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))

  const submit = async (e) => {
    e.preventDefault()
    const items = form.items.filter((it) => it.medicine.trim())
    if (items.length === 0) {
      setError('Add at least one medicine before saving.')
      return
    }
    for (const it of items) {
      if (it.frequency === 'other' && !it.customFrequency.trim()) {
        setError(`Enter a custom frequency for ${it.medicine}.`)
        return
      }
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        patientId,
        consultationId,
        visitId,
        notes: form.notes,
        items: items.map((it) => ({
          medicine: it.medicine,
          genericName: it.genericName,
          dosage: it.dosage,
          unit: it.unit,
          frequency: it.frequency,
          customFrequency: it.frequency === 'other' ? it.customFrequency : '',
          duration: it.duration === '' ? undefined : Number(it.duration),
          durationUnit: it.durationUnit,
          route: it.route,
          quantity: it.quantity === '' ? undefined : Number(it.quantity),
          foodInstruction: it.foodInstruction,
          instructions: it.instructions,
          notes: it.notes,
        })),
      }
      await createPrescription(payload)
      await load()
      setNotice('Prescription saved as draft. Issue it when ready to hand over.')
      setOpen(false)
      setForm({ notes: '', items: [emptyItem()] })
    } catch (err) {
      setError(err.message || 'Failed to save prescription.')
    } finally {
      setSaving(false)
    }
  }

  const doIssue = async (rx) => {
    setError('')
    setNotice('')
    try {
      await issuePrescription(rx.id)
      await load()
      setNotice('Prescription issued.')
    } catch (err) {
      setError(err.message || 'Unable to issue prescription.')
    }
  }

  const runCancelConfirm = async () => {
    if (!confirmRx) return
    setCancelling(true)
    setError('')
    setNotice('')
    try {
      await updatePrescription(confirmRx.id, { status: 'cancelled', cancelReason: 'Cancelled from consultation' })
      await load()
      setConfirmRx(null)
      setNotice('Prescription cancelled.')
    } catch (err) {
      setError(err.message || 'Unable to cancel prescription.')
      setConfirmRx(null)
    } finally {
      setCancelling(false)
    }
  }

  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const renderItem = (it) => (
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
          {it.quantity !== null && it.quantity !== undefined ? ` · Qty ${it.quantity}` : ''}
        </span>
        {it.instructions && <span className="rx-item-instructions">“{it.instructions}”</span>}
      </div>
    </li>
  )

  return (
    <SectionCard
      title="Prescription"
      description="Medicines for this consultation. Prescriptions save as draft and are issued to the patient at handover."
    >
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-success">{notice}</div>}

      {loading ? (
        <p className="muted">Loading prescriptions…</p>
      ) : prescriptions.length === 0 ? (
        <p className="state-card">No prescriptions for this consultation yet.</p>
      ) : (
        <div className="rx-list">
          {prescriptions.map((rx) => {
            const locked = LOCKED_STATUSES.includes(rx.status)
            return (
              <div className="rx-card" key={rx.id}>
                <div className="rx-card-head">
                  <div className="rx-head-main">
                    <span className="plan-number">{rx.prescriptionNumber}</span>
                    <span className="muted">
                      {fmtDate(rx.rxDate)} · {rx.medicineCount} medicine{rx.medicineCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <span className="status-badge">
                    {PRESCRIPTION_STATUS_BY_VALUE[rx.status] || rx.status}
                  </span>
                </div>
                {rx.notes && <p className="muted">{rx.notes}</p>}
                <ul className="rx-items">{rx.items.map(renderItem)}</ul>
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
                {!readOnly && (
                  <div className="plan-actions">
                    {!locked && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => doIssue(rx)}>
                        Issue Prescription
                      </button>
                    )}
                    {!locked && (
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmRx(rx)}>
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!readOnly && !open && (
        <button type="button" className="btn btn-outline btn-block inline-flex items-center justify-center gap-1" onClick={() => setOpen(true)}>
          <Plus size={12} /> New Prescription
        </button>
      )}

      {!readOnly && open && (
        <form className="rx-form" onSubmit={submit}>
          <div className="rx-form-items">
            {form.items.map((it, i) => (
              <div className="rx-line" key={i}>
                <div className="rx-line-head">
                  <span className="field-label">Medicine {i + 1}</span>
                  {form.items.length > 1 && (
                    <button type="button" className="danger-link" onClick={() => removeItem(i)}>
                      Remove
                    </button>
                  )}
                </div>
                <div className="form-grid">
                  <label className="field">
                    <span className="field-label">Medicine</span>
                    <input
                      list="rx-medicine-picker"
                      value={it.medicine}
                      onChange={(e) => setItem(i, { medicine: e.target.value })}
                      placeholder="Select or type medicine"
                      required
                    />
                    <datalist id="rx-medicine-picker">
                      {MEDICINE_LIBRARY.map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </label>
                  <label className="field">
                    <span className="field-label">Generic name</span>
                    <input
                      value={it.genericName}
                      onChange={(e) => setItem(i, { genericName: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Dosage</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={it.dosage}
                      onChange={(e) => setItem(i, { dosage: e.target.value })}
                      placeholder="500"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Unit</span>
                    <select value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })}>
                      {DOSAGE_UNIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Frequency</span>
                    <select value={it.frequency} onChange={(e) => setItem(i, { frequency: e.target.value })}>
                      {FREQUENCY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {it.frequency === 'other' && (
                    <label className="field">
                      <span className="field-label">Custom frequency</span>
                      <input
                        value={it.customFrequency}
                        onChange={(e) => setItem(i, { customFrequency: e.target.value })}
                        placeholder="e.g. Every 2 hours"
                      />
                    </label>
                  )}
                  <label className="field">
                    <span className="field-label">Duration</span>
                    <input
                      type="number"
                      min="0"
                      value={it.duration}
                      onChange={(e) => setItem(i, { duration: e.target.value })}
                      placeholder="5"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Duration unit</span>
                    <select value={it.durationUnit} onChange={(e) => setItem(i, { durationUnit: e.target.value })}>
                      {DURATION_UNIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Route</span>
                    <select value={it.route} onChange={(e) => setItem(i, { route: e.target.value })}>
                      {ROUTE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Quantity</span>
                    <input
                      type="number"
                      min="0"
                      value={it.quantity}
                      onChange={(e) => setItem(i, { quantity: e.target.value })}
                      placeholder="15"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">Food instruction</span>
                    <select
                      value={it.foodInstruction}
                      onChange={(e) => setItem(i, { foodInstruction: e.target.value })}
                    >
                      {FOOD_INSTRUCTION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <TextField
                  label="Instructions"
                  value={it.instructions}
                  onChange={(v) => setItem(i, { instructions: v })}
                />
                <TextField label="Notes" value={it.notes} onChange={(v) => setItem(i, { notes: v })} />
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-outline btn-sm inline-flex items-center gap-1" onClick={addItem}>
            <Plus size={12} /> Add medicine
          </button>
          <TextField label="Prescription notes" textarea value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Draft Prescription'}
            </button>
          </div>
        </form>
      )}

      <ConfirmationDialog
        open={Boolean(confirmRx)}
        title="Cancel Prescription?"
        message={`Are you sure you want to cancel prescription ${confirmRx?.prescriptionNumber || ''}? This action cannot be undone.`}
        confirmText="Cancel Prescription"
        cancelText="Keep"
        variant="danger"
        loading={cancelling}
        loadingText="Cancelling…"
        onConfirm={runCancelConfirm}
        onCancel={() => setConfirmRx(null)}
      />
    </SectionCard>
  )
}