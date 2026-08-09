import { useEffect, useState } from 'react'
import { SectionCard, TextField } from '../ui/fields'
import {
  INVESTIGATION_PRIORITY_BY_VALUE,
  INVESTIGATION_PRIORITY_OPTIONS,
  INVESTIGATION_STATUS_BY_VALUE,
  INVESTIGATION_STATUS_OPTIONS,
  INVESTIGATION_TYPE_BY_VALUE,
  INVESTIGATION_TYPE_OPTIONS,
} from '../../constants/options'
import {
  addInvestigationResult,
  consultationInvestigations,
  createInvestigation,
  updateInvestigation,
} from '../../services/investigationService'

const CLOSED_STATUSES = ['completed', 'cancelled']

export default function InvestigationSection({ patientId, consultationId, visitId, readOnly = false }) {
  const [investigations, setInvestigations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    type: 'opg',
    customType: '',
    reason: '',
    indication: '',
    priority: 'routine',
    notes: '',
  })
  const [resultBoxId, setResultBoxId] = useState(null)
  const [resultForm, setResultForm] = useState({ findings: '', interpretation: '', notes: '' })

  const load = async () => {
    if (!consultationId) return
    await Promise.resolve()
    setLoading(true)
    setError('')
    try {
      const res = await consultationInvestigations(consultationId)
      setInvestigations(res.investigations || [])
    } catch (err) {
      setError(err.message || 'Unable to load investigations.')
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
        const res = await consultationInvestigations(consultationId)
        if (!cancelled) setInvestigations(res.investigations || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load investigations.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [consultationId])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.reason.trim()) {
      setError('Enter a reason / clinical indication for the investigation.')
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
        type: form.type,
        customType: form.type === 'other' ? form.customType : undefined,
        reason: form.reason,
        indication: form.indication,
        priority: form.priority,
        notes: form.notes,
      }
      await createInvestigation(payload)
      await load()
      setNotice('Investigation requested. Record the result once available.')
      setOpen(false)
      setForm({ type: 'opg', customType: '', reason: '', indication: '', priority: 'routine', notes: '' })
    } catch (err) {
      setError(err.message || 'Failed to request investigation.')
    } finally {
      setSaving(false)
    }
  }

  const submitResult = async (inv) => {
    if (!resultForm.findings.trim()) {
      setError('Enter the result findings.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await addInvestigationResult(inv.id, resultForm)
      await load()
      setResultBoxId(null)
      setResultForm({ findings: '', interpretation: '', notes: '' })
      setNotice('Investigation result saved. Previous result preserved in history.')
    } catch (err) {
      setError(err.message || 'Failed to save investigation result.')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (inv, status) => {
    setError('')
    setNotice('')
    try {
      await updateInvestigation(inv.id, { status })
      await load()
      setNotice(`Investigation status updated to ${INVESTIGATION_STATUS_BY_VALUE[status] || status}.`)
    } catch (err) {
      setError(err.message || 'Unable to update investigation status.')
    }
  }

  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <SectionCard
      title="Investigations"
      description="Radiographic and laboratory requests. Results are added later — a new result preserves the previous one."
    >
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-success">{notice}</div>}

      {loading ? (
        <p className="muted">Loading investigations…</p>
      ) : investigations.length === 0 ? (
        <p className="state-card">No investigations requested for this consultation yet.</p>
      ) : (
        <div className="inv-list">
          {investigations.map((inv) => {
            const closed = CLOSED_STATUSES.includes(inv.status) || inv.status === 'result-available'
            return (
              <div className="inv-card" key={inv.id}>
                <div className="inv-card-head">
                  <div className="inv-head-main">
                    <span className="plan-number">{inv.investigationNumber}</span>
                    <span className="inv-name">
                      {INVESTIGATION_TYPE_BY_VALUE[inv.type] || inv.typeLabel || inv.type}
                    </span>
                    <span className="muted">
                      {fmtDate(inv.requestedDate)} · {INVESTIGATION_PRIORITY_BY_VALUE[inv.priority] || inv.priority}
                    </span>
                  </div>
                  <span className="status-badge">
                    {INVESTIGATION_STATUS_BY_VALUE[inv.status] || inv.status}
                  </span>
                </div>
                {inv.reason && <p className="muted">Reason: {inv.reason}</p>}
                {inv.indication && <p className="muted">Indication: {inv.indication}</p>}
                {inv.notes && <p className="muted">Notes: {inv.notes}</p>}

                {inv.result && (
                  <div className="inv-result">
                    <div className="inv-result-head">
                      <span className="inv-result-label">Result</span>
                      <span className="muted">
                        {fmtDate(inv.result.resultDate)} · {inv.result.completedBy?.name || '—'}
                      </span>
                    </div>
                    {inv.result.findings && <p>Findings: {inv.result.findings}</p>}
                    {inv.result.interpretation && <p>Interpretation: {inv.result.interpretation}</p>}
                    {inv.result.notes && <p className="muted">Notes: {inv.result.notes}</p>}
                  </div>
                )}

                {inv.resultHistory.length > 0 && (
                  <details className="inv-history">
                    <summary>
                      Previous results ({inv.resultHistory.length})
                    </summary>
                    {inv.resultHistory.map((h, i) => (
                      <div className="inv-result inv-result-history" key={i}>
                        <p>Findings: {h.findings}</p>
                        {h.interpretation && <p>Interpretation: {h.interpretation}</p>}
                        <p className="muted">{fmtDate(h.resultDate)}</p>
                      </div>
                    ))}
                  </details>
                )}

                {!readOnly && !closed && (
                  <div className="plan-actions">
                    {inv.status !== 'cancelled' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setResultBoxId(resultBoxId === inv.id ? null : inv.id)
                          setResultForm({ findings: '', interpretation: '', notes: '' })
                        }}
                      >
                        {resultBoxId === inv.id ? 'Close' : '+ Add Result'}
                      </button>
                    )}
                    <select
                      className="small-select"
                      value={inv.status}
                      onChange={(e) => changeStatus(inv, e.target.value)}
                      aria-label="Investigation status"
                    >
                      {INVESTIGATION_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {resultBoxId === inv.id && !closed && (
                  <div className="inv-result-box">
                    <TextField
                      label="Findings"
                      textarea
                      value={resultForm.findings}
                      onChange={(v) => setResultForm((f) => ({ ...f, findings: v }))}
                    />
                    <TextField
                      label="Interpretation"
                      textarea
                      value={resultForm.interpretation}
                      onChange={(v) => setResultForm((f) => ({ ...f, interpretation: v }))}
                    />
                    <TextField
                      label="Notes"
                      textarea
                      value={resultForm.notes}
                      onChange={(v) => setResultForm((f) => ({ ...f, notes: v }))}
                    />
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={saving}
                        onClick={() => submitResult(inv)}
                      >
                        {saving ? 'Saving…' : 'Save Result'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!readOnly && !open && (
        <button type="button" className="btn btn-outline btn-block" onClick={() => setOpen(true)}>
          + Request Investigation
        </button>
      )}

      {!readOnly && open && (
        <form className="inv-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Type</span>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {INVESTIGATION_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {form.type === 'other' && (
              <label className="field">
                <span className="field-label">Custom type</span>
                <input
                  value={form.customType}
                  onChange={(e) => setForm((f) => ({ ...f, customType: e.target.value }))}
                  placeholder="e.g. Blood report"
                />
              </label>
            )}
            <label className="field">
              <span className="field-label">Priority</span>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                {INVESTIGATION_PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <TextField
            label="Reason for investigation"
            textarea
            value={form.reason}
            onChange={(v) => setForm((f) => ({ ...f, reason: v }))}
          />
          <TextField
            label="Clinical indication"
            textarea
            value={form.indication}
            onChange={(v) => setForm((f) => ({ ...f, indication: v }))}
          />
          <TextField
            label="Notes"
            textarea
            value={form.notes}
            onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
          />
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Request Investigation'}
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  )
}