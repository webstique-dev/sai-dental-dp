import { useEffect, useMemo, useState } from 'react'
import { SectionCard, TextField } from '../ui/fields'
import {
  PLAN_ITEM_STATUS_OPTIONS,
  PLAN_PRIORITY_OPTIONS,
  PLAN_STATUS_BY_VALUE,
  TOOTH_DROPDOWN_OPTIONS,
  TOOTH_PROCEDURE_OPTIONS,
} from '../../constants/options'
import {
  addPlanItem,
  approvePlan,
  createTreatmentPlan,
  declinePlan,
  patientTreatmentPlans,
  removePlanItem,
  updatePlanItem,
  updateTreatmentPlan,
} from '../../services/treatmentPlanService'
import { consultationDiagnoses } from '../../services/diagnosisService'
import { createTreatmentRecord } from '../../services/treatmentRecordService'

const CLOSED_STATUSES = ['completed', 'cancelled']

export default function TreatmentPlanSection({ patientId, consultationId, visitId, readOnly = false }) {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [diagnosisOptions, setDiagnosisOptions] = useState([])

  const [planForm, setPlanForm] = useState({ name: '', notes: '' })
  const [itemForm, setItemForm] = useState({
    procedure: '',
    toothNumber: 0,
    priority: 'medium',
    estimatedCost: '',
    status: 'planned',
    diagnosisId: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [declineBox, setDeclineBox] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const load = async () => {
    if (!patientId) return
    await Promise.resolve()
    setLoading(true)
    setError('')
    try {
      const res = await patientTreatmentPlans(patientId)
      setPlans(res.plans || [])
    } catch (err) {
      setError(err.message || 'Unable to load treatment plans.')
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
        const res = await patientTreatmentPlans(patientId)
        if (!cancelled) setPlans(res.plans || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load treatment plans.')
      } finally {
        if (!cancelled) setLoading(false)
      }
      if (!cancelled && consultationId) {
        try {
          const dres = await consultationDiagnoses(consultationId)
          if (!cancelled) setDiagnosisOptions(dres.diagnoses || [])
        } catch {
          if (!cancelled) setDiagnosisOptions([])
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [patientId, consultationId])

  const activePlan = useMemo(() => plans.find((p) => p.id === activeId) || null, [plans, activeId])

  const resetItemForm = () =>
    setItemForm({
      procedure: '',
      toothNumber: 0,
      priority: 'medium',
      estimatedCost: '',
      status: 'planned',
      diagnosisId: '',
      notes: '',
    })

  const createPlan = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const res = await createTreatmentPlan({
        patientId,
        consultationId,
        visitId,
        name: planForm.name,
        notes: planForm.notes,
      })
      setPlans((prev) => [res.plan, ...prev])
      setActiveId(res.plan.id)
      setOpen(false)
      setPlanForm({ name: '', notes: '' })
      setNotice('Treatment plan created (draft). Add items below.')
    } catch (err) {
      setError(err.message || 'Failed to create treatment plan.')
    } finally {
      setSaving(false)
    }
  }

  const addItem = async (e) => {
    e.preventDefault()
    if (!activePlan || !itemForm.procedure.trim()) {
      setError('Select a procedure for the plan item.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await addPlanItem(activePlan.id, {
        procedure: itemForm.procedure,
        toothNumber: Number(itemForm.toothNumber) || 0,
        priority: itemForm.priority,
        estimatedCost: itemForm.estimatedCost,
        status: itemForm.status,
        diagnosisId: itemForm.diagnosisId || undefined,
        notes: itemForm.notes,
      })
      await load()
      resetItemForm()
      setNotice('Plan item added.')
    } catch (err) {
      setError(err.message || 'Failed to add plan item.')
    } finally {
      setSaving(false)
    }
  }

  const setPlanStatus = async (plan, status) => {
    setError('')
    setNotice('')
    try {
      if (status === 'approved') {
        await approvePlan(plan.id)
      } else if (status === 'declined') {
        await declinePlan(plan.id, declineReason || 'Declined')
      } else {
        await updateTreatmentPlan(plan.id, { status })
      }
      await load()
      setDeclineBox(false)
      setDeclineReason('')
      setNotice(`Plan status updated to ${PLAN_STATUS_BY_VALUE[status] || status}.`)
    } catch (err) {
      setError(err.message || 'Failed to update plan status.')
    }
  }

  const changeItemStatus = async (plan, item, status) => {
    setError('')
    setNotice('')
    try {
      await updatePlanItem(plan.id, item.id, { status })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to update item status.')
    }
  }

  const deleteItem = async (plan, item) => {
    setError('')
    setNotice('')
    try {
      await removePlanItem(plan.id, item.id)
      await load()
      setNotice('Plan item removed.')
    } catch (err) {
      setError(err.message || 'Failed to remove plan item.')
    }
  }

  const startTreatment = async (plan, item) => {
    setError('')
    setNotice('')
    setSaving(true)
    try {
      await createTreatmentRecord({
        patientId,
        consultationId,
        visitId,
        treatmentPlanId: plan.id,
        treatmentPlanItemId: item.id,
        toothNumber: item.toothNumber || 0,
        procedure: item.procedure,
        status: 'in-progress',
        procedureDate: new Date().toISOString().slice(0, 10),
      })
      await load()
      setNotice(`Treatment "${item.procedure}" started — recorded in Treatment Execution.`)
    } catch (err) {
      setError(err.message || 'Failed to start treatment.')
    } finally {
      setSaving(false)
    }
  }

  const planClosed = (plan) => CLOSED_STATUSES.includes(plan.status)
  const canEdit = !readOnly

  return (
    <SectionCard
      title="Treatment Plan"
      description="Proposed treatment with estimated costs. Plans are append-only — new plans never overwrite earlier ones."
    >
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-success">{notice}</div>}

      {loading ? (
        <p className="muted">Loading treatment plans…</p>
      ) : plans.length === 0 ? (
        <p className="state-card">No treatment plans yet. Create one to propose treatment to the patient.</p>
      ) : (
        <div className="plan-list">
          {plans.map((plan) => {
            const isActive = activeId === plan.id
            return (
              <div className={`plan-card${isActive ? ' is-active' : ''}`} key={plan.id}>
                <button
                  type="button"
                  className="plan-card-head"
                  onClick={() => setActiveId(isActive ? null : plan.id)}
                  aria-expanded={isActive}
                >
                  <div className="plan-head-main">
                    <span className="plan-number">{plan.planNumber}</span>
                    <span className="plan-name">{plan.name || 'Untitled plan'}</span>
                  </div>
                  <div className="plan-head-meta">
                    <span className="status-badge">{PLAN_STATUS_BY_VALUE[plan.status] || plan.status}</span>
                    <span className="muted">
                      {plan.itemCount} items · ₹{plan.estimatedTotal}
                    </span>
                  </div>
                </button>

                {isActive && (
                  <div className="plan-body">
                    <div className="plan-actions">
                      {!canEdit ? null : (
                        <>
                          {plan.status === 'draft' && (
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setPlanStatus(plan, 'proposed')}>
                              Propose
                            </button>
                          )}
                          {['draft', 'proposed'].includes(plan.status) && (
                            <>
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => setPlanStatus(plan, 'approved')}>
                                Approve
                              </button>
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => setDeclineBox(true)}>
                                Decline
                              </button>
                            </>
                          )}
                          {['approved', 'in-progress'].includes(plan.status) && (
                            <>
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPlanStatus(plan, 'in-progress')}>
                                Start
                              </button>
                              <button type="button" className="btn btn-outline btn-sm" onClick={() => setPlanStatus(plan, 'completed')}>
                                Mark Completed
                              </button>
                            </>
                          )}
                          {!planClosed(plan) && (
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setPlanStatus(plan, 'cancelled')}>
                              Cancel Plan
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {declineBox && !planClosed(plan) && (
                      <div className="decline-box">
                        <TextField label="Decline reason" value={declineReason} onChange={setDeclineReason} />
                        <div className="form-actions">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDeclineBox(false)}>
                            Back
                          </button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => setPlanStatus(plan, 'declined')}>
                            Confirm Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {plan.declineReason && plan.status === 'declined' && (
                      <p className="muted">Declined: {plan.declineReason}</p>
                    )}

                    {plan.items.length === 0 ? (
                      <p className="state-card">No items in this plan yet.</p>
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
                            <div className="plan-item-actions">
                              {!canEdit || planClosed(plan) ? (
                                <span className="status-badge">
                                  {PLAN_ITEM_STATUS_OPTIONS.find((o) => o.value === item.status)?.label || item.status}
                                </span>
                              ) : (
                                <>
                                  {['planned', 'scheduled'].includes(item.status) && (
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm"
                                      disabled={saving}
                                      onClick={() => startTreatment(plan, item)}
                                    >
                                      Start Treatment
                                    </button>
                                  )}
                                  <select
                                    className="small-select"
                                    value={item.status}
                                    onChange={(e) => changeItemStatus(plan, item, e.target.value)}
                                    aria-label="Item status"
                                  >
                                    {PLAN_ITEM_STATUS_OPTIONS.map((o) => (
                                      <option key={o.value} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="btn-icon"
                                    title="Remove item"
                                    onClick={() => deleteItem(plan, item)}
                                  >
                                    ×
                                  </button>
                                </>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {canEdit && !planClosed(plan) && (
                      <form className="plan-item-form" onSubmit={addItem}>
                        <div className="form-grid">
                          <label className="field">
                            <span className="field-label">Procedure</span>
                            <input
                              list="plan-procedure-picker"
                              value={itemForm.procedure}
                              onChange={(e) => setItemForm((f) => ({ ...f, procedure: e.target.value }))}
                              placeholder="Select procedure"
                              required
                            />
                            <datalist id="plan-procedure-picker">
                              {TOOTH_PROCEDURE_OPTIONS.map((p) => (
                                <option key={p} value={p} />
                              ))}
                            </datalist>
                          </label>
                          <label className="field">
                            <span className="field-label">Tooth</span>
                            <select
                              value={itemForm.toothNumber}
                              onChange={(e) => setItemForm((f) => ({ ...f, toothNumber: Number(e.target.value) || 0 }))}
                            >
                              {TOOTH_DROPDOWN_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span className="field-label">Priority</span>
                            <select
                              value={itemForm.priority}
                              onChange={(e) => setItemForm((f) => ({ ...f, priority: e.target.value }))}
                            >
                              {PLAN_PRIORITY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="field">
                            <span className="field-label">Estimated cost (₹)</span>
                            <input
                              type="number"
                              min="0"
                              value={itemForm.estimatedCost}
                              onChange={(e) => setItemForm((f) => ({ ...f, estimatedCost: e.target.value }))}
                              placeholder="0"
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Linked diagnosis</span>
                            <select
                              value={itemForm.diagnosisId}
                              onChange={(e) => setItemForm((f) => ({ ...f, diagnosisId: e.target.value }))}
                            >
                              <option value="">None</option>
                              {diagnosisOptions.map((dg) => (
                                <option key={dg.id} value={dg.id}>
                                  {dg.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="form-actions">
                          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                            {saving ? 'Adding…' : '+ Add Item'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {canEdit && !open && plans.length > 0 && (
        <button type="button" className="btn btn-outline btn-block" onClick={() => setOpen(true)}>
          + New Treatment Plan
        </button>
      )}

      {canEdit && open && (
        <form className="plan-create-form" onSubmit={createPlan}>
          <TextField label="Plan name (optional)" value={planForm.name} onChange={(v) => setPlanForm((f) => ({ ...f, name: v }))} />
          <TextField label="Notes" textarea value={planForm.notes} onChange={(v) => setPlanForm((f) => ({ ...f, notes: v }))} />
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Plan'}
            </button>
          </div>
        </form>
      )}

      {canEdit && !open && plans.length === 0 && (
        <button type="button" className="btn btn-outline btn-block" onClick={() => setOpen(true)}>
          + Create Treatment Plan
        </button>
      )}
    </SectionCard>
  )
}