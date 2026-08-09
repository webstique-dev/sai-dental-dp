import { useEffect, useState } from 'react'
import { SectionCard, TextField } from '../ui/fields'
import {
  FOLLOW_UP_TYPE_BY_VALUE,
  FOLLOW_UP_TYPE_OPTIONS,
  FOLLOW_UP_STATUS_BY_VALUE,
} from '../../constants/options'
import {
  cancelFollowUp,
  completeFollowUp,
  consultationFollowUps,
  createFollowUp,
  scheduleFollowUp,
  updateFollowUp,
} from '../../services/followUpService'

const CLOSED_STATUSES = ['completed', 'cancelled']

export default function FollowUpSection({
  patientId,
  consultationId,
  visitId,
  treatmentRecordId,
  readOnly = false,
}) {
  const [followUps, setFollowUps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    type: 'review',
    followUpDate: '',
    followUpTime: '',
    reason: '',
    instructions: '',
    notes: '',
  })
  const [actionId, setActionId] = useState(null)
  const [completeNotes, setCompleteNotes] = useState('')
  const [rescheduleDate, setRescheduleDate] = useState('')

  const load = async () => {
    if (!consultationId) return
    await Promise.resolve()
    setLoading(true)
    setError('')
    try {
      const res = await consultationFollowUps(consultationId)
      setFollowUps(res.followUps || [])
    } catch (err) {
      setError(err.message || 'Unable to load follow-ups.')
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
        const res = await consultationFollowUps(consultationId)
        if (!cancelled) setFollowUps(res.followUps || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load follow-ups.')
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
    if (!form.followUpDate) {
      setError('Choose a follow-up date.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await createFollowUp({
        patientId,
        consultationId,
        visitId,
        treatmentRecordId,
        type: form.type,
        followUpDate: form.followUpDate,
        followUpTime: form.followUpTime,
        reason: form.reason,
        instructions: form.instructions,
        notes: form.notes,
      })
      await load()
      setNotice('Follow-up planned. Schedule an appointment when the patient confirms.')
      setOpen(false)
      setForm({ type: 'review', followUpDate: '', followUpTime: '', reason: '', instructions: '', notes: '' })
    } catch (err) {
      setError(err.message || 'Failed to create follow-up.')
    } finally {
      setSaving(false)
    }
  }

  const doSchedule = async (fu) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await scheduleFollowUp(fu.id, {})
      await load()
      setNotice('Follow-up scheduled and linked to an appointment.')
    } catch (err) {
      setError(err.message || 'Unable to schedule follow-up.')
    } finally {
      setSaving(false)
    }
  }

  const saveComplete = async (fu) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await completeFollowUp(fu.id, { notes: completeNotes })
      await load()
      setActionId(null)
      setCompleteNotes('')
      setNotice('Follow-up completed.')
    } catch (err) {
      setError(err.message || 'Unable to complete follow-up.')
    } finally {
      setSaving(false)
    }
  }

  const doCancel = async (fu) => {
    setError('')
    setNotice('')
    try {
      await cancelFollowUp(fu.id, { reason: 'Follow-up cancelled' })
      await load()
      setNotice('Follow-up cancelled.')
    } catch (err) {
      setError(err.message || 'Unable to cancel follow-up.')
    }
  }

  const doReschedule = async (fu) => {
    if (!rescheduleDate) {
      setError('Choose a new follow-up date.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await updateFollowUp(fu.id, { followUpDate: rescheduleDate, status: 'rescheduled' })
      await load()
      setActionId(null)
      setRescheduleDate('')
      setNotice('Follow-up rescheduled.')
    } catch (err) {
      setError(err.message || 'Unable to reschedule follow-up.')
    } finally {
      setSaving(false)
    }
  }

  const fmtDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const canAct = (fu) =>
    !readOnly && !CLOSED_STATUSES.includes(fu.status) &&
    ['planned', 'scheduled', 'rescheduled'].includes(fu.status)

  return (
    <SectionCard
      title="Follow-up"
      description="Plan and track post-treatment reviews. Scheduling links the follow-up to an appointment."
    >
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-success">{notice}</div>}

      {loading ? (
        <p className="muted">Loading follow-ups…</p>
      ) : followUps.length === 0 ? (
        <p className="state-card">No follow-ups planned for this consultation yet.</p>
      ) : (
        <div className="inv-list">
          {followUps.map((fu) => (
            <div className="inv-card" key={fu.id}>
              <div className="inv-card-head">
                <div className="inv-head-main">
                  <span className="plan-number">{fu.followUpNumber}</span>
                  <span className="inv-name">{FOLLOW_UP_TYPE_BY_VALUE[fu.type] || fu.type}</span>
                  <span className="muted">
                    {fmtDate(fu.followUpDate)}
                    {fu.followUpTime ? ` · ${fu.followUpTime}` : ''}
                  </span>
                </div>
                <span className="status-badge">{FOLLOW_UP_STATUS_BY_VALUE[fu.status] || fu.status}</span>
              </div>
              {fu.reason && <p className="muted">Reason: {fu.reason}</p>}
              {fu.instructions && <p className="muted">Instructions: {fu.instructions}</p>}
              {fu.appointment && (
                <p className="muted">
                  Appointment:{' '}
                  {fu.appointment.appointmentNumber || ''}{' '}
                  {fu.appointment.date ? fmtDate(fu.appointment.date) : ''}
                </p>
              )}
              {fu.completedAt && (
                <p className="muted">
                  Completed {fmtDate(fu.completedAt)}
                  {fu.completedBy?.name ? ` by ${fu.completedBy.name}` : ''}
                </p>
              )}

              {canAct(fu) && (
                <div className="plan-actions">
                  {fu.status === 'planned' && (
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => doSchedule(fu)}>
                      Schedule
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setActionId(actionId === `${fu.id}:complete` ? null : `${fu.id}:complete`)
                      setCompleteNotes('')
                    }}
                  >
                    Complete
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setActionId(actionId === `${fu.id}:resched` ? null : `${fu.id}:resched`)
                      setRescheduleDate('')
                    }}
                  >
                    Reschedule
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => doCancel(fu)}>
                    Cancel
                  </button>
                </div>
              )}

              {actionId === `${fu.id}:complete` && (
                <div className="inv-result-box">
                  <TextField
                    label="Completion notes"
                    textarea
                    value={completeNotes}
                    onChange={(v) => setCompleteNotes(v)}
                  />
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={saving}
                      onClick={() => saveComplete(fu)}
                    >
                      {saving ? 'Saving…' : 'Save Completion'}
                    </button>
                  </div>
                </div>
              )}

              {actionId === `${fu.id}:resched` && (
                <div className="inv-result-box">
                  <label className="field">
                    <span className="field-label">New follow-up date</span>
                    <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
                  </label>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={saving}
                      onClick={() => doReschedule(fu)}
                    >
                      {saving ? 'Saving…' : 'Reschedule'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!readOnly && !open && (
        <button type="button" className="btn btn-outline btn-block" onClick={() => setOpen(true)}>
          + Plan Follow-up
        </button>
      )}

      {!readOnly && open && (
        <form className="inv-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Type</span>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {FOLLOW_UP_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Follow-up date</span>
              <input
                type="date"
                value={form.followUpDate}
                onChange={(e) => setForm((f) => ({ ...f, followUpDate: e.target.value }))}
              />
            </label>
            <label className="field">
              <span className="field-label">Time (optional)</span>
              <input
                type="time"
                value={form.followUpTime}
                onChange={(e) => setForm((f) => ({ ...f, followUpTime: e.target.value }))}
              />
            </label>
          </div>
          <TextField label="Reason" textarea value={form.reason} onChange={(v) => setForm((f) => ({ ...f, reason: v }))} />
          <TextField label="Instructions" textarea value={form.instructions} onChange={(v) => setForm((f) => ({ ...f, instructions: v }))} />
          <TextField label="Notes" textarea value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Plan Follow-up'}
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  )
}