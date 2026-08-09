import { useEffect, useState } from 'react'
import { SectionCard, TextField } from '../ui/fields'
import {
  DIAGNOSIS_CATEGORY_OPTIONS,
  DIAGNOSIS_OPTIONS,
  DIAGNOSIS_STATUS_OPTIONS,
  TOOTH_DROPDOWN_OPTIONS,
} from '../../constants/options'
import {
  consultationDiagnoses,
  createDiagnosis,
  updateDiagnosis,
} from '../../services/diagnosisService'

export default function DiagnosisSection({ patientId, consultationId, visitId, readOnly = false }) {
  const [diagnoses, setDiagnoses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: 'dental',
    toothNumber: 0,
    findings: '',
    notes: '',
    status: 'active',
  })

  const load = async () => {
    if (!consultationId) return
    await Promise.resolve()
    setLoading(true)
    setError('')
    try {
      const res = await consultationDiagnoses(consultationId)
      setDiagnoses(res.diagnoses || [])
    } catch (err) {
      setError(err.message || 'Unable to load diagnoses.')
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
        const res = await consultationDiagnoses(consultationId)
        if (!cancelled) setDiagnoses(res.diagnoses || [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load diagnoses.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [consultationId])

  const applyTemplate = (name) => {
    const found = DIAGNOSIS_OPTIONS.find((o) => o.name === name)
    if (found) {
      setForm((f) => ({
        ...f,
        category: found.category,
        toothNumber: found.defaultTooth ? 16 : 0,
      }))
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Enter a diagnosis name.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await createDiagnosis({
        patientId,
        consultationId,
        visitId,
        name: form.name,
        category: form.category,
        toothNumber: Number(form.toothNumber) || 0,
        findings: form.findings,
        notes: form.notes,
        status: form.status,
      })
      await load()
      setNotice('Diagnosis recorded.')
      setOpen(false)
      setForm({ name: '', category: 'dental', toothNumber: 0, findings: '', notes: '', status: 'active' })
    } catch (err) {
      setError(err.message || 'Failed to save diagnosis.')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (diag, status) => {
    setError('')
    try {
      await updateDiagnosis(diag.id, { status })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to update diagnosis status.')
    }
  }

  return (
    <SectionCard
      title="Diagnosis"
      description="Clinical diagnoses linked to this consultation. Attach a tooth for tooth-specific findings."
    >
      {error && <div className="form-error">{error}</div>}
      {notice && <div className="form-success">{notice}</div>}

      {loading ? (
        <p className="muted">Loading diagnoses…</p>
      ) : diagnoses.length === 0 ? (
        <p className="state-card">No diagnoses recorded for this consultation yet.</p>
      ) : (
        <ul className="diag-list">
          {diagnoses.map((dg) => (
            <li className="diag-row" key={dg.id}>
              <div className="diag-main">
                <span className="diag-name">{dg.name}</span>
                <span className="muted">
                  {dg.hasTooth ? `Tooth ${dg.toothNumber}` : 'General'} · {dg.category}
                  {dg.findings ? ` · ${dg.findings}` : ''}
                </span>
              </div>
              {!readOnly ? (
                <select
                  className="small-select"
                  value={dg.status}
                  onChange={(e) => changeStatus(dg, e.target.value)}
                  aria-label="Diagnosis status"
                >
                  {DIAGNOSIS_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="status-badge">
                  {DIAGNOSIS_STATUS_OPTIONS.find((o) => o.value === dg.status)?.label || dg.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <>
          {!open ? (
            <button type="button" className="btn btn-outline btn-block" onClick={() => setOpen(true)}>
              + Add Diagnosis
            </button>
          ) : (
            <form className="diagnosis-form" onSubmit={submit}>
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Diagnosis name</span>
                  <input
                    list="diagnosis-picker"
                    value={form.name}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, name: e.target.value }))
                      applyTemplate(e.target.value)
                    }}
                    placeholder="Select or type a diagnosis"
                    required
                  />
                  <datalist id="diagnosis-picker">
                    {DIAGNOSIS_OPTIONS.map((o) => (
                      <option key={o.name} value={o.name} />
                    ))}
                  </datalist>
                </label>
                <label className="field">
                  <span className="field-label">Category</span>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                    {DIAGNOSIS_CATEGORY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Tooth</span>
                  <select
                    value={form.toothNumber}
                    onChange={(e) => setForm((f) => ({ ...f, toothNumber: Number(e.target.value) || 0 }))}
                  >
                    {TOOTH_DROPDOWN_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Status</span>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                    {DIAGNOSIS_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <TextField
                label="Diagnosis details / findings"
                textarea
                value={form.findings}
                onChange={(v) => setForm((f) => ({ ...f, findings: v }))}
              />
              <TextField label="Notes" textarea value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Diagnosis'}
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </SectionCard>
  )
}