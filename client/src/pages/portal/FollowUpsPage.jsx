import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { SectionCard, Field } from '../../components/ui/fields'
import ConfirmationDialog from '../../components/common/ConfirmationDialog'
import {
  FOLLOW_UP_STATUS_BY_VALUE,
  FOLLOW_UP_TYPE_BY_VALUE,
  FOLLOW_UP_TYPE_OPTIONS,
} from '../../constants/options'
import {
  patientFollowUps,
  upcomingFollowUps,
  createFollowUp,
  scheduleFollowUp,
  completeFollowUp,
  cancelFollowUp,
} from '../../services/followUpService'
import { listPatients, getPatient } from '../../services/patientService'
import useAuth from '../../hooks/useAuth'

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function FollowUpsPage() {
  const [params, setParams] = useSearchParams()
  const fromPatient = params.get('patient')
  const { user } = useAuth()
  const isReceptionist = user?.role === 'receptionist'

  const [patient, setPatient] = useState(null)
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState([])
  const [searching, setSearching] = useState(false)
  const [followUps, setFollowUps] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [loading, setLoading] = useState(false)
  const [upcomingLoading, setUpcomingLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    type: 'review',
    followUpDate: '',
    followUpTime: '',
    reason: '',
    instructions: '',
    notes: '',
  })
  const [confirmFu, setConfirmFu] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setUpcomingLoading(true)
      try {
        const res = await upcomingFollowUps()
        if (!cancelled) setUpcoming(res.followUps || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load upcoming follow-ups.')
      } finally {
        if (!cancelled) setUpcomingLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await Promise.resolve()
      if (!fromPatient) return
      if (cancelled) return
      try {
        const res = await getPatient(fromPatient)
        if (!cancelled) setPatient(res.patient)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load patient.')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [fromPatient])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!fromPatient) return
      setLoading(true)
      setError('')
      try {
        const res = await patientFollowUps(fromPatient)
        if (!cancelled) setFollowUps(res.followUps || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load follow-ups.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fromPatient])

  const runSearch = async (e) => {
    e.preventDefault()
    if (!search.trim()) return
    setSearching(true)
    setError('')
    try {
      const res = await listPatients({ search: search.trim(), limit: 20 })
      setPatients(res.items)
    } catch (err) {
      setError(err.message || 'Unable to search patients')
    } finally {
      setSearching(false)
    }
  }

  const selectPatient = (p) => {
    setPatient(p)
    setPatients([])
    setSearch('')
    setParams({ patient: p._id || p.id })
  }

  const selectPatientFromFU = (fu) => {
    const pid = fu.patient?._id || fu.patient?.id
    if (!pid) return
    setParams({ patient: pid })
  }

  const patientId = fromPatient || (patient && (patient._id || patient.id))

  const submitCreate = async (e) => {
    e.preventDefault()
    if (!patientId) return
    setBusy(true)
    setError('')
    try {
      await createFollowUp({ patientId, ...form })
      setShowCreate(false)
      setForm({ type: 'review', followUpDate: '', followUpTime: '', reason: '', instructions: '', notes: '' })
      await reloadUpcoming()
      await reloadPatientList()
    } catch (err) {
      setError(err.message || 'Unable to create follow-up.')
    } finally {
      setBusy(false)
    }
  }

  const reloadUpcoming = async () => {
    try {
      const res = await upcomingFollowUps()
      setUpcoming(res.followUps || [])
    } catch (err) {
      setError(err.message || 'Unable to refresh upcoming follow-ups.')
    }
  }

  const reloadPatientList = async () => {
    try {
      const res = await patientFollowUps(patientId)
      setFollowUps(res.followUps || [])
    } catch (err) {
      setError(err.message || 'Unable to refresh patient follow-ups.')
    }
  }

  const act = async (fn, id, payload) => {
    setBusy(true)
    setError('')
    try {
      await fn(id, payload)
      await reloadUpcoming()
      await reloadPatientList()
    } catch (err) {
      setError(err.message || 'Unable to update follow-up.')
    } finally {
      setBusy(false)
    }
  }

  const runCancelConfirm = async () => {
    if (!confirmFu) return
    setCancelling(true)
    setError('')
    try {
      await cancelFollowUp(confirmFu.id, { reason: 'Follow-up cancelled' })
      await reloadUpcoming()
      await reloadPatientList()
      setConfirmFu(null)
    } catch (err) {
      setError(err.message || 'Unable to cancel follow-up.')
      setConfirmFu(null)
    } finally {
      setCancelling(false)
    }
  }

  const isOpen = (s) => !['completed', 'cancelled'].includes(s)

  return (
    <div>
      <div className="portal-heading">
        <h1>Follow-ups</h1>
        <p>Planned post-treatment reviews, scheduled appointments and completion status.</p>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {!patientId && (
        <SectionCard title="Upcoming follow-ups">
          {upcomingLoading ? (
            <p className="muted">Loading upcoming follow-ups…</p>
          ) : upcoming.length === 0 ? (
            <p className="state-card">No upcoming follow-ups.</p>
          ) : (
            <div className="inv-list">
              {upcoming.map((fu) => (
                <div className="inv-card" key={fu.id}>
                  <div className="inv-card-head">
                    <div className="inv-head-main">
                      <span className="plan-number">{fu.followUpNumber}</span>
                      <span className="inv-name">{FOLLOW_UP_TYPE_BY_VALUE[fu.type] || fu.type}</span>
                      <span className="muted">
                        {fu.patient?.firstName} {fu.patient?.lastName} · {fmtDate(fu.followUpDate)}
                        {fu.followUpTime ? ` · ${fu.followUpTime}` : ''}
                      </span>
                    </div>
                    <span className="status-badge">{FOLLOW_UP_STATUS_BY_VALUE[fu.status] || fu.status}</span>
                  </div>
                  {fu.reason && <p className="muted">Reason: {fu.reason}</p>}
                  {isOpen(fu.status) && (
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={busy}
                        onClick={() => selectPatientFromFU(fu)}
                      >
                        View patient
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {!patientId && (
        <SectionCard title="Find a patient">
          <form className="search-row" onSubmit={runSearch}>
            <input
              className="search-input"
              type="search"
              aria-label="Search patients"
              value={search}
              placeholder="Search by name, patient ID or phone…"
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>
          {patients.length > 0 && (
            <div className="patient-results">
              {patients.map((p) => (
                <button
                  key={p._id}
                  type="button"
                  className="patient-result-row"
                  onClick={() => selectPatient(p)}
                >
                  <span className="patient-result-name">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="patient-result-meta">
                    {p.patientId} · {p.gender} · {p.phone || '—'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {patientId && (
        <SectionCard title={patient ? `${patient.firstName} ${patient.lastName} — Follow-ups` : 'Patient follow-ups'}>
          <div className="billing-toolbar">
            <span className="muted">
              {patient ? `${patient.patientId} · ${patient.gender || '—'} · ${patient.phone || '—'}` : `Patient ${fromPatient}`}
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setParams({})}
            >
              Back
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? 'Cancel' : <><Plus size={12} className="mr-1" /> Schedule follow-up</>}
            </button>
          </div>

          {showCreate && (
            <form className="rx-form" onSubmit={submitCreate}>
              <div className="form-grid">
                <Field label="Type">
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {FOLLOW_UP_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date *">
                  <input
                    type="date"
                    value={form.followUpDate}
                    onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                  />
                </Field>
                <Field label="Time">
                  <input
                    type="time"
                    value={form.followUpTime}
                    onChange={(e) => setForm({ ...form, followUpTime: e.target.value })}
                  />
                </Field>
                <Field label="Reason">
                  <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                </Field>
              </div>
              <Field label="Instructions">
                <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
              </Field>
              <Field label="Notes">
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !form.followUpDate}>
                  {busy ? 'Saving…' : 'Schedule'}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="muted">Loading follow-ups…</p>
          ) : followUps.length === 0 ? (
            <p className="state-card">No follow-ups planned for this patient.</p>
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
                  {fu.treatmentRecord && (
                    <p className="muted">
                      Treatment: {fu.treatmentRecord.procedure || ''}
                      {fu.treatmentRecord.toothNumber ? ` (Tooth ${fu.treatmentRecord.toothNumber})` : ''}
                    </p>
                  )}
                  {fu.appointment && (
                    <p className="muted">
                      Appointment: {fu.appointment.appointmentNumber || ''}{' '}
                      {fu.appointment.date ? fmtDate(fu.appointment.date) : ''}
                    </p>
                  )}
                  {fu.completedAt && (
                    <p className="muted">
                      Completed {fmtDate(fu.completedAt)}
                      {fu.completedBy?.name ? ` by ${fu.completedBy.name}` : ''}
                    </p>
                  )}
                  {isOpen(fu.status) && fu.status !== 'scheduled' && (
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={busy}
                        onClick={() => act(scheduleFollowUp, fu.id, {})}
                      >
                        Schedule
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={busy}
                        onClick={() => setConfirmFu(fu)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {!isReceptionist && isOpen(fu.status) && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busy}
                      onClick={() => act(completeFollowUp, fu.id, {})}
                    >
                      Complete
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <ConfirmationDialog
        open={Boolean(confirmFu)}
        title="Cancel Follow-up?"
        message={`Are you sure you want to cancel follow-up ${confirmFu?.followUpNumber || ''}? This action cannot be undone.`}
        confirmText="Cancel Follow-up"
        cancelText="Keep"
        variant="danger"
        loading={cancelling}
        loadingText="Cancelling…"
        onConfirm={runCancelConfirm}
        onCancel={() => setConfirmFu(null)}
      />
    </div>
  )
}