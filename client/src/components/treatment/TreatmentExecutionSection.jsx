import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { SectionCard, TextField } from '../ui/fields'
import ConfirmationDialog from '../common/ConfirmationDialog'
import {
  TREATMENT_OUTCOME_BY_VALUE,
  TREATMENT_OUTCOME_OPTIONS,
  TREATMENT_RECORD_EDITABLE_STATUSES,
  TREATMENT_RECORD_STATUS_BY_VALUE,
  TREATMENT_RECORD_STATUS_OPTIONS,
  TOOTH_DROPDOWN_OPTIONS,
  TOOTH_PROCEDURE_OPTIONS,
} from '../../constants/options'
import {
  cancelTreatmentRecord,
  completeTreatmentRecord,
  consultationTreatmentRecords,
  createTreatmentRecord,
  updateTreatmentRecord,
} from '../../services/treatmentRecordService'
import { patientTreatmentPlans } from '../../services/treatmentPlanService'

const CLOSED_STATUSES = ['completed', 'cancelled']

export default function TreatmentExecutionSection({
  patientId,
  consultationId,
  visitId,
  planItemId,
  readOnly = false,
}) {
  const [records, setRecords] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [confirmRec, setConfirmRec] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [form, setForm] = useState({
    procedure: '',
    toothNumber: 0,
    procedureDate: new Date().toISOString().slice(0, 10),
    status: 'in-progress',
    findings: '',
    notes: '',
    outcome: 'successful',
    followUpRecommended: false,
    followUpDays: '',
    treatmentPlanId: '',
    treatmentPlanItemId: planItemId || '',
    materials: [],
    anesthesiaUsed: false,
    anesthesiaType: '',
    anesthesiaAmount: '',
  })

  const load = async () => {
    if (!consultationId) return
    await Promise.resolve()
    setLoading(true)
    setError('')
    try {
      const res = await consultationTreatmentRecords(consultationId)
      setRecords(res.records || [])
    } catch (err) {
      setError(err.message || 'Unable to load treatment records.')
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
        const [recRes, planRes] = await Promise.all([
          consultationTreatmentRecords(consultationId),
          patientTreatmentPlans(patientId),
        ])
        if (cancelled) return
        setRecords(recRes.records || [])
        setPlans(planRes.plans || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load treatment records.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [patientId, consultationId])

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === form.treatmentPlanId) || null,
    [plans, form.treatmentPlanId],
  )

  const resetForm = () =>
    setForm({
      procedure: '',
      toothNumber: 0,
      procedureDate: new Date().toISOString().slice(0, 10),
      status: 'in-progress',
      findings: '',
      notes: '',
      outcome: 'successful',
      followUpRecommended: false,
      followUpDays: '',
      treatmentPlanId: '',
      treatmentPlanItemId: planItemId || '',
      materials: [],
      anesthesiaUsed: false,
      anesthesiaType: '',
      anesthesiaAmount: '',
    })

  const submit = async (e) => {
    e.preventDefault()
    if (!form.procedure.trim()) {
      setError('Enter the procedure being performed.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        patientId,
        consultationId,
        visitId,
        procedure: form.procedure,
        toothNumber: Number(form.toothNumber) || 0,
        procedureDate: form.procedureDate,
        status: form.status,
        findings: form.findings,
        notes: form.notes,
        outcome: form.outcome,
        followUpRecommended: form.followUpRecommended,
        followUpDays: form.followUpDays || undefined,
        treatmentPlanId: form.treatmentPlanId || undefined,
        treatmentPlanItemId: form.treatmentPlanItemId || undefined,
        materials: form.materials.filter((m) => m.name),
        anesthesia: {
          used: form.anesthesiaUsed,
          type: form.anesthesiaType,
          amount: form.anesthesiaAmount,
        },
      }
      await createTreatmentRecord(payload)
      await load()
      const made = form.status === 'completed'
      setNotice(
        made
          ? 'Treatment saved and completed. It is now permanent in the tooth history.'
          : 'Treatment record saved. Complete it when the procedure is finished.',
      )
      setOpen(false)
      resetForm()
    } catch (err) {
      setError(err.message || 'Failed to save the treatment record.')
    } finally {
      setSaving(false)
    }
  }

  const changeRecordStatus = async (rec, status) => {
    setError('')
    setNotice('')
    try {
      await updateTreatmentRecord(rec.id, { status })
      await load()
      if (status === 'completed') setNotice('Treatment completed.')
      else setNotice('Treatment record updated.')
    } catch (err) {
      setError(err.message || 'Unable to update treatment record.')
    }
  }

  const doComplete = async (rec) => {
    setError('')
    setNotice('')
    try {
      await completeTreatmentRecord(rec.id)
      await load()
      setNotice('Treatment completed successfully.')
    } catch (err) {
      setError(err.message || 'Unable to complete treatment.')
    }
  }

  const runCancelConfirm = async () => {
    if (!confirmRec) return
    setCancelling(true)
    setError('')
    setNotice('')
    try {
      await cancelTreatmentRecord(confirmRec.id, { reason: 'Treatment cancelled' })
      await load()
      setConfirmRec(null)
      setNotice('Treatment cancelled.')
    } catch (err) {
      setError(err.message || 'Unable to cancel treatment.')
      setConfirmRec(null)
    } finally {
      setCancelling(false)
    }
  }

  const addMaterial = () => setForm((f) => ({ ...f, materials: [...f.materials, { name: '', quantity: '' }] }))
  const updateMaterial = (i, field, value) =>
    setForm((f) => ({
      ...f,
      materials: f.materials.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)),
    }))
  const removeMaterial = (i) =>
    setForm((f) => ({ ...f, materials: f.materials.filter((_, idx) => idx !== i) }))

  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const planOptions = plans.filter((p) => !CLOSED_STATUSES.includes(p.status))

  return (
    <SectionCard
      title="Treatment Execution"
      description="Record what was actually done. Executed treatment updates the plan item and permanent tooth history on completion."
    >
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-success">{notice}</div>}

      {loading ? (
        <p className="muted">Loading treatment records…</p>
      ) : records.length === 0 ? (
        <p className="state-card">No treatment records for this consultation yet.</p>
      ) : (
        <div className="inv-list">
          {records.map((rec) => {
            const closed = CLOSED_STATUSES.includes(rec.status)
            return (
              <div className="inv-card" key={rec.id}>
                <div className="inv-card-head">
                  <div className="inv-head-main">
                    <span className="plan-number">{rec.recordNumber}</span>
                    <span className="inv-name">
                      {rec.procedure}
                      {rec.hasTooth ? ` (Tooth ${rec.toothNumber})` : ''}
                    </span>
                    <span className="muted">{fmtDate(rec.procedureDate)}</span>
                  </div>
                  <span className="status-badge">{TREATMENT_RECORD_STATUS_BY_VALUE[rec.status] || rec.status}</span>
                </div>
                {rec.findings && <p className="muted">Findings: {rec.findings}</p>}
                {rec.notes && <p className="muted">Notes: {rec.notes}</p>}
                {rec.materials.length > 0 && (
                  <p className="muted">
                    Materials: {rec.materials.map((m) => `${m.name}${m.quantity ? ` × ${m.quantity}` : ''}`).join(', ')}
                  </p>
                )}
                {rec.treatmentPlan && (
                  <p className="muted">
                    Plan: {rec.treatmentPlan.planNumber || ''} — {rec.treatmentPlan.name || 'Untitled'}
                  </p>
                )}
                {rec.completedAt && (
                  <p className="muted">
                    Completed {fmtDate(rec.completedAt)}
                    {rec.completedBy?.name ? ` by ${rec.completedBy.name}` : ''} ·{' '}
                    {TREATMENT_OUTCOME_BY_VALUE[rec.outcome] || rec.outcome}
                  </p>
                )}

                {!readOnly && !closed && (
                  <div className="plan-actions">
                    {rec.status !== 'completed' && (
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => doComplete(rec)}>
                        Complete
                      </button>
                    )}
                    {TREATMENT_RECORD_EDITABLE_STATUSES.includes(rec.status) && (
                      <select
                        className="small-select"
                        value={rec.status}
                        onChange={(e) => changeRecordStatus(rec, e.target.value)}
                        aria-label="Treatment record status"
                      >
                        {TREATMENT_RECORD_STATUS_OPTIONS.filter((o) =>
                          TREATMENT_RECORD_EDITABLE_STATUSES.includes(o.value),
                        ).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {rec.status !== 'cancelled' && (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmRec(rec)}>
                        Cancel
                      </button>
                    )}
                  </div>
                )}
                {closed && (
                  <span className="muted">
                    {rec.status === 'completed' ? 'Record closed — terminal.' : 'Record closed.'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!readOnly && !open && (
        <button type="button" className="btn btn-outline btn-block" onClick={() => setOpen(true)}>
          + Record Treatment
        </button>
      )}

      {!readOnly && open && (
        <form className="inv-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Procedure</span>
              <input
                list="exec-procedure-picker"
                value={form.procedure}
                onChange={(e) => setForm((f) => ({ ...f, procedure: e.target.value }))}
                required
              />
              <datalist id="exec-procedure-picker">
                {TOOTH_PROCEDURE_OPTIONS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span className="field-label">Tooth</span>
              <select value={form.toothNumber} onChange={(e) => setForm((f) => ({ ...f, toothNumber: Number(e.target.value) || 0 }))}>
                {TOOTH_DROPDOWN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Date</span>
              <input type="date" value={form.procedureDate} onChange={(e) => setForm((f) => ({ ...f, procedureDate: e.target.value }))} />
            </label>
            <label className="field">
              <span className="field-label">Status</span>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {TREATMENT_RECORD_EDITABLE_STATUSES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Linked plan</span>
              <select value={form.treatmentPlanId} onChange={(e) => setForm((f) => ({ ...f, treatmentPlanId: e.target.value, treatmentPlanItemId: '' }))}>
                <option value="">No plan</option>
                {planOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedPlan && (
            <label className="field">
              <span className="field-label">Plan item being executed</span>
              <select value={form.treatmentPlanItemId} onChange={(e) => setForm((f) => ({ ...f, treatmentPlanItemId: e.target.value }))}>
                <option value="">Select item</option>
                {selectedPlan.items
                  .filter((it) => !CLOSED_STATUSES.includes(it.status))
                  .map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.procedure}
                      {it.hasTooth ? ` (Tooth ${it.toothNumber})` : ''}
                    </option>
                  ))}
              </select>
            </label>
          )}

          <TextField label="Findings" textarea value={form.findings} onChange={(v) => setForm((f) => ({ ...f, findings: v }))} />
          <TextField label="Notes" textarea value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <label className="field">
            <span className="field-label">Outcome</span>
            <select value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))}>
              {TREATMENT_OUTCOME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="exec-materials">
            <div className="v-row">
              <span className="field-label">Materials/consumables</span>
              {form.materials.map((m, i) => (
                <div className="med-row" key={i}>
                  <input
                    placeholder="Material"
                    value={m.name}
                    onChange={(e) => updateMaterial(i, 'name', e.target.value)}
                  />
                  <input
                    placeholder="Qty"
                    value={m.quantity}
                    onChange={(e) => updateMaterial(i, 'quantity', e.target.value)}
                  />
                  <button type="button" className="danger-link" onClick={() => removeMaterial(i)}>
                    Remove
                  </button>
                </div>
              ))}
              {form.materials.length === 0 && (
                <button type="button" className="btn btn-outline btn-sm inline-flex items-center gap-1" onClick={addMaterial}>
                  <Plus size={12} /> Add material
                </button>
              )}
            </div>
          </div>

          <label className="field">
            <span className="field-label">Anesthesia used</span>
            <select value={form.anesthesiaUsed ? 'yes' : 'no'} onChange={(e) => setForm((f) => ({ ...f, anesthesiaUsed: e.target.value === 'yes' }))}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
          {form.anesthesiaUsed && (
            <div className="form-grid">
              <TextField label="Anesthesia type" value={form.anesthesiaType} onChange={(v) => setForm((f) => ({ ...f, anesthesiaType: v }))} />
              <TextField label="Amount" value={form.anesthesiaAmount} onChange={(v) => setForm((f) => ({ ...f, anesthesiaAmount: v }))} />
            </div>
          )}

          <label className="field">
            <span className="field-label">Follow-up recommended</span>
            <select value={form.followUpRecommended ? 'yes' : 'no'} onChange={(e) => setForm((f) => ({ ...f, followUpRecommended: e.target.value === 'yes' }))}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
          {form.followUpRecommended && (
            <TextField label="Follow-up after (days)" type="number" min="0" value={form.followUpDays} onChange={(v) => setForm((f) => ({ ...f, followUpDays: v }))} />
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Treatment Record'}
            </button>
          </div>
        </form>
      )}

      <ConfirmationDialog
        open={Boolean(confirmRec)}
        title="Cancel Treatment?"
        message={`Are you sure you want to cancel treatment "${confirmRec?.procedure || ''}"${confirmRec?.hasTooth ? ` (Tooth ${confirmRec.toothNumber})` : ''}? This action cannot be undone.`}
        confirmText="Cancel Treatment"
        cancelText="Keep"
        variant="danger"
        loading={cancelling}
        loadingText="Cancelling…"
        onConfirm={runCancelConfirm}
        onCancel={() => setConfirmRec(null)}
      />
    </SectionCard>
  )
}