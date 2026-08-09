import { useEffect, useState } from 'react'
import { Field, TextField } from '../ui/fields'
import {
  TOOTH_CONDITION_OPTIONS,
  TOOTH_CONDITION_BY_VALUE,
  TOOTH_TREATMENT_STATUS_OPTIONS,
  TOOTH_PROCEDURE_OPTIONS,
} from '../../constants/options'
import {
  getToothHistory,
  addFinding,
  addTreatment,
  updateTooth,
} from '../../services/toothChartService'
import { patientDiagnoses } from '../../services/diagnosisService'
import { patientTreatmentPlans } from '../../services/treatmentPlanService'
import { PLAN_STATUS_BY_VALUE, PLAN_ITEM_STATUS_OPTIONS } from '../../constants/options'

const fmtDate = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const today = () => new Date().toISOString().slice(0, 10)

function StatusChip({ value }) {
  const c = TOOTH_CONDITION_BY_VALUE[value] || TOOTH_CONDITION_BY_VALUE.healthy
  return (
    <span className={`tooth-status-chip chip-${value}`}>
      {c.label}
      {c.code ? ` (${c.code})` : ''}
    </span>
  )
}

function historyEventKey(e) {
  const base = `${e.type}-${e.id || ''}`
  const num = e.id ? String(e.id).replace(/[^0-9]/g, '').slice(-6) : ''
  return `${base}-${num}-${String(e.date || '')}-${e.title}`
}

export default function ToothDetailPanel({
  patientId,
  toothNumber,
  onClose,
  readOnly = false,
  visitId,
  consultationId,
  onChange,
}) {
  const [tooth, setTooth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [toothDiagnoses, setToothDiagnoses] = useState([])
  const [toothPlanItems, setToothPlanItems] = useState([])

  const [finding, setFinding] = useState({ condition: 'caries', findings: '', notes: '' })
  const [treatment, setTreatment] = useState({
    procedure: '',
    status: 'completed',
    charges: '',
    date: today(),
    notes: '',
  })
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      await Promise.resolve()
      if (cancelled) return
      setLoading(true)
      setError('')
      setTooth(null)
      try {
        const res = await getToothHistory(patientId, toothNumber)
        if (cancelled) return
        setTooth(res.tooth)
        setNotes(res.tooth.notes || '')
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load tooth history.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const loadClinical = async () => {
      try {
        const [dRes, pRes] = await Promise.all([
          patientDiagnoses(patientId),
          patientTreatmentPlans(patientId),
        ])
        if (cancelled) return
        setToothDiagnoses(
          (dRes.diagnoses || []).filter(
            (dg) => dg.hasTooth && Number(dg.toothNumber) === Number(toothNumber) && dg.status === 'active',
          ),
        )
        const items = []
        for (const plan of pRes.plans || []) {
          if (['completed', 'cancelled'].includes(plan.status)) continue
          for (const item of plan.items || []) {
            if (!item.hasTooth) continue
            if (Number(item.toothNumber) !== Number(toothNumber)) continue
            if (['completed', 'cancelled'].includes(item.status)) continue
            items.push({ ...item, planNumber: plan.planNumber, planStatus: plan.status, planId: plan.id })
          }
        }
        items.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'urgent' ? -1 : b.priority === 'urgent' ? 1 : 0))
        setToothPlanItems(items)
      } catch {
        if (!cancelled) {
          setToothDiagnoses([])
          setToothPlanItems([])
        }
      }
    }
    loadClinical()
    return () => {
      cancelled = true
    }
  }, [patientId, toothNumber])

  const latestCompleted = (tooth?.treatments || [])
    .filter((t) => t.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  const nextPlanned = (tooth?.treatments || [])
    .filter((t) => ['planned', 'started', 'in-progress'].includes(t.status))
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0]

  const refresh = async () => {
    const res = await getToothHistory(patientId, toothNumber)
    setTooth(res.tooth)
    setNotes(res.tooth.notes || '')
    if (onChange) onChange()
  }

  const currentVisitId = visitId

  const saveFinding = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        condition: finding.condition,
        findings: finding.findings,
        notes: finding.notes,
        date: finding.date || today(),
      }
      if (currentVisitId) payload.visitId = currentVisitId
      if (consultationId) payload.consultationId = consultationId
      await addFinding(patientId, toothNumber, payload)
      setFinding({ condition: 'caries', findings: '', date: today(), notes: '' })
      setNotice('Finding recorded.')
      await refresh()
    } catch (err) {
      setError(err.message || 'Unable to save finding.')
    } finally {
      setSaving(false)
    }
  }

  const saveTreatment = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    if (!treatment.procedure.trim()) {
      setError('Procedure is required.')
      setSaving(false)
      return
    }
    try {
      const payload = {
        procedure: treatment.procedure.trim(),
        status: treatment.status,
        charges: Number(treatment.charges) || 0,
        notes: treatment.notes,
        date: treatment.date || today(),
      }
      if (currentVisitId) payload.visitId = currentVisitId
      if (consultationId) payload.consultationId = consultationId
      await addTreatment(patientId, toothNumber, payload)
      setTreatment({
        procedure: '',
        status: 'completed',
        charges: '',
        date: today(),
        notes: '',
      })
      setNotice('Treatment recorded.')
      await refresh()
    } catch (err) {
      setError(err.message || 'Unable to save treatment.')
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async () => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await updateTooth(patientId, toothNumber, { notes })
      setNotice('Notes saved.')
      await refresh()
    } catch (err) {
      setError(err.message || 'Unable to save notes.')
    } finally {
      setSaving(false)
    }
  }

  const events = (tooth?.timeline || []).slice()
  const condition = TOOTH_CONDITION_BY_VALUE[tooth?.currentStatus] || TOOTH_CONDITION_BY_VALUE.healthy

  return (
    <div className="tooth-modal-backdrop" onMouseDown={onClose}>
      <div className="tooth-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="tooth-modal-head">
          <div>
            <div className="tooth-modal-title">Tooth {toothNumber}</div>
            {tooth && (
              <div className="tooth-modal-sub">
                Current: <StatusChip value={tooth.currentStatus} />
              </div>
            )}
          </div>
          <button type="button" className="link-back" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && <p className="page-loader-inline">Loading tooth history…</p>}
        {error && !tooth && (
          <div className="state-card state-card-sm">
            <p>{error}</p>
            <button type="button" className="btn btn-outline btn-sm mt" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        )}

        {!loading && tooth && (
          <>
            {notice && <div className="form-success">{notice}</div>}
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}

            <div className="tooth-status-grid">
              <div className="tooth-status-card">
                <span>Current Condition</span>
                <b>{condition.label}</b>
                {condition.code && <em>({condition.code})</em>}
              </div>
              {latestCompleted && (
                <div className="tooth-status-card latest">
                  <span>Latest Treatment</span>
                  <b>{latestCompleted.procedure}</b>
                  <em>{fmtDate(latestCompleted.date)}</em>
                </div>
              )}
              {nextPlanned && (
                <div className="tooth-status-card planned">
                  <span>Next Planned Treatment</span>
                  <b>{nextPlanned.procedure}</b>
                  <em>{fmtDate(nextPlanned.date)}</em>
                </div>
              )}
            </div>

            <section className="tooth-section">
              <h4>Treatment History</h4>
              {events.length === 0 ? (
                <p className="muted">No treatment history recorded for Tooth {toothNumber}.</p>
              ) : (
                <div className="tooth-timeline">
                  {events.map((ev) => (
                    <div key={historyEventKey(ev)} className="tooth-timeline-item">
                      <div className="ttl-date">{fmtDate(ev.date)}</div>
                      <div className="ttl-body">
                        <div className="ttl-title">
                          {ev.type === 'treatment' ? 'Treatment' : 'Finding'}
                          <span className="ttl-arrow">→</span>
                          {ev.title}
                        </div>
                        {ev.description && <div className="ttl-desc">{ev.description}</div>}
                        {(ev.type === 'treatment' && ev.charges > 0 && (
                          <div className="ttl-meta">Charges: ₹{Number(ev.charges).toLocaleString('en-IN')}</div>
                        ))}
                        {ev.notes && <div className="ttl-meta">{ev.notes}</div>}
                        <div className="ttl-meta-small">
                          {ev.status && <span>Status: {ev.status}</span>}
                          {ev.doctor && <span>Dr: {ev.doctor}</span>}
                          {ev.visit && <span>OP: {ev.visit}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {!readOnly && (
              <>
                <section className="tooth-section">
                  <h4>New Finding</h4>
                  <form onSubmit={saveFinding} className="tooth-form">
                    <Field label="Condition">
                      <select
                        value={finding.condition}
                        onChange={(e) => setFinding({ ...finding, condition: e.target.value })}
                      >
                        {TOOTH_CONDITION_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <TextField
                      label="Date"
                      type="date"
                      value={finding.date}
                      onChange={(v) => setFinding({ ...finding, date: v })}
                    />
                    <TextField
                      label="Findings"
                      textarea
                      rows={2}
                      value={finding.findings}
                      onChange={(v) => setFinding({ ...finding, findings: v })}
                    />
                    <TextField
                      label="Notes"
                      textarea
                      rows={2}
                      value={finding.notes}
                      onChange={(v) => setFinding({ ...finding, notes: v })}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                      {saving ? 'Saving…' : 'Save finding'}
                    </button>
                  </form>
                </section>

                <section className="tooth-section">
                  <h4>New Treatment</h4>
                  <form onSubmit={saveTreatment} className="tooth-form">
                    <Field label="Procedure">
                      <input
                        list="tooth-procedures"
                        value={treatment.procedure}
                        onChange={(e) => setTreatment({ ...treatment, procedure: e.target.value })}
                        placeholder="Select or type a procedure"
                      />
                      <datalist id="tooth-procedures">
                        {TOOTH_PROCEDURE_OPTIONS.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </Field>
                    <div className="tooth-form-grid">
                      <Field label="Date">
                        <input
                          type="date"
                          value={treatment.date}
                          onChange={(e) => setTreatment({ ...treatment, date: e.target.value })}
                        />
                      </Field>
                      <Field label="Charges (₹)">
                        <input
                          type="number"
                          min="0"
                          value={treatment.charges}
                          onChange={(e) => setTreatment({ ...treatment, charges: e.target.value })}
                        />
                      </Field>
                    </div>
                    <Field label="Status">
                      <select
                        value={treatment.status}
                        onChange={(e) => setTreatment({ ...treatment, status: e.target.value })}
                      >
                        {TOOTH_TREATMENT_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <TextField
                      label="Notes"
                      textarea
                      rows={2}
                      value={treatment.notes}
                      onChange={(v) => setTreatment({ ...treatment, notes: v })}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                      {saving ? 'Saving…' : 'Save treatment'}
                    </button>
                  </form>
                </section>

                <section className="tooth-section">
                  <h4>Notes</h4>
                  <textarea
                    className="assessment-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <button type="button" onClick={saveNotes} className="btn btn-secondary btn-sm" disabled={saving}>
                    Save notes
                  </button>
                </section>
              </>
            )}

            <section className="tooth-section">
              <h4>Diagnosis & Planned Treatment</h4>
              {toothDiagnoses.length === 0 && toothPlanItems.length === 0 ? (
                <p className="muted">No active diagnosis or planned treatment for Tooth {toothNumber}.</p>
              ) : (
                <>
                  {toothDiagnoses.length > 0 && (
                    <div className="tooth-clinical-block">
                      <span className="ttl-meta">Active diagnosis</span>
                      {toothDiagnoses.map((dg) => (
                        <div key={dg.id} className="ttl-body">
                          <div className="ttl-title">{dg.name}</div>
                          {dg.findings && <div className="ttl-desc">{dg.findings}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  {toothPlanItems.length > 0 && (
                    <div className="tooth-clinical-block">
                      <span className="ttl-meta">Planned treatment</span>
                      <ul className="plan-item-list">
                        {toothPlanItems.map((item) => (
                          <li className="plan-item" key={`${item.planId}-${item.id}`}>
                            <div className="plan-item-main">
                              <span className="plan-item-proc">{item.procedure}</span>
                              <span className="muted">
                                {PLAN_STATUS_BY_VALUE[item.planStatus] || item.planStatus} ·{' '}
                                {PLAN_ITEM_STATUS_OPTIONS.find((o) => o.value === item.status)?.label || item.status} · ₹
                                {item.estimatedCost}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}